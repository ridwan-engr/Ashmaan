// services/performance/schedulerResilienceBaselineService.js

import {
    performance,
} from "node:perf_hooks";


/*
|--------------------------------------------------------------------------
| ASHMAAN
| Phase 14.11 — Production Scheduler Resilience
|--------------------------------------------------------------------------
|
| Controlled validation harness only.
|
| Production scheduler behavior is evidenced separately from:
|
| services/scheduler/vrmScheduler.js
| services/scheduler/syncJobRunner.js
|
| This module does NOT:
|
| - start the production scheduler
| - call VRM
| - read or write MongoDB
| - execute production sync jobs
| - change scheduler configuration
| - create an alternative production scheduler
| - perform equipment control
| - perform automatic dispatch
|
|--------------------------------------------------------------------------
*/


export const SCHEDULER_RESILIENCE_PHASE =
    "14.11";

export const SCHEDULER_RESILIENCE_LAYER =
    "SCHEDULER_RESILIENCE";

export const SCHEDULER_RESILIENCE_CATEGORY =
    "OVERLAP_FAILURE_LIFECYCLE_CONTROL";


export const SCHEDULER_RESILIENCE_DEFAULTS =
    Object.freeze({
        workerDelayMs:
            8,

        independentWorkerDelayMs:
            4,
    });


export const SCHEDULER_RESILIENCE_LIMITS =
    Object.freeze({
        maxWorkerDelayMs:
            250,
    });


export const SCHEDULER_RESILIENCE_BOUNDARIES =
    Object.freeze({
        productionSchedulerInspected:
            true,

        productionSchedulerStarted:
            false,

        alternativeProductionSchedulerCreated:
            false,

        overlapProtectionRequired:
            true,

        lockReleaseRequired:
            true,

        boundedConcurrencyRequired:
            true,

        workerStartPacingRequired:
            true,

        failureIsolationRequired:
            true,

        longRunningJobObservabilityRequired:
            true,

        controlledShutdownRequired:
            true,

        scheduledHandleCleanupRequired:
            true,

        controlledRestartRequired:
            true,

        unboundedDuplicateWorkAllowed:
            false,

        performsDatabaseRead:
            false,

        performsDatabaseWrite:
            false,

        performsVrmRequest:
            false,

        changesSchedulerConfiguration:
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


function nonNegativeInteger(
    value,
    name
) {
    if (
        !Number.isInteger(
            value
        ) ||
        value <
            0
    ) {
        throw new TypeError(
            `${name} must be a non-negative integer.`
        );
    }

    return value;
}


function validateDelay(
    delayMs
) {
    nonNegativeInteger(
        delayMs,
        "delayMs"
    );

    if (
        delayMs >
        SCHEDULER_RESILIENCE_LIMITS
            .maxWorkerDelayMs
    ) {
        throw new RangeError(
            "delayMs exceeds Phase 14.11 safety limit."
        );
    }

    return delayMs;
}


function sleep(
    delayMs
) {
    return new Promise(
        (
            resolve
        ) => {
            setTimeout(
                resolve,
                delayMs
            );
        }
    );
}


/*
|--------------------------------------------------------------------------
| Controlled scheduler-lock harness
|--------------------------------------------------------------------------
|
| Models only the lock invariants already used by production scheduler.
| It is NOT a production scheduler implementation.
|
|--------------------------------------------------------------------------
*/

export function createControlledSchedulerLockHarness() {
    const locks =
        new Map();

    const events =
        [];


    function isLocked(
        jobName
    ) {
        return (
            locks.get(
                jobName
            ) ===
            true
        );
    }


    async function runJob({
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
                "worker function is required."
            );
        }


        if (
            isLocked(
                jobName
            )
        ) {
            events.push({
                type:
                    "SKIPPED_OVERLAP",

                jobName,

                timestamp:
                    performance.now(),
            });


            return Object.freeze({
                status:
                    "SKIPPED_OVERLAP",

                jobName,

                executed:
                    false,
            });
        }


        locks.set(
            jobName,
            true
        );


        const startedAt =
            performance.now();


        events.push({
            type:
                "STARTED",

            jobName,

            timestamp:
                startedAt,
        });


        try {
            const value =
                await worker();


            const completedAt =
                performance.now();


            events.push({
                type:
                    "COMPLETED",

                jobName,

                timestamp:
                    completedAt,
            });


            return Object.freeze({
                status:
                    "COMPLETED",

                jobName,

                executed:
                    true,

                durationMs:
                    completedAt -
                    startedAt,

                value,
            });
        } catch (error) {
            const failedAt =
                performance.now();


            events.push({
                type:
                    "FAILED",

                jobName,

                timestamp:
                    failedAt,

                message:
                    error?.message ??
                    String(
                        error
                    ),
            });


            return Object.freeze({
                status:
                    "FAILED",

                jobName,

                executed:
                    true,

                durationMs:
                    failedAt -
                    startedAt,

                error:
                    {
                        message:
                            error?.message ??
                            String(
                                error
                            ),
                    },
            });
        } finally {
            locks.set(
                jobName,
                false
            );


            events.push({
                type:
                    "LOCK_RELEASED",

                jobName,

                timestamp:
                    performance.now(),
            });
        }
    }


    return Object.freeze({
        runJob,

        isLocked,

        getEvents() {
            return events.map(
                (
                    event
                ) => ({
                    ...event,
                })
            );
        },
    });
}


/*
|--------------------------------------------------------------------------
| Controlled scheduler-handle lifecycle harness
|--------------------------------------------------------------------------
|
| Does not create timers.
| Only validates bounded lifecycle accounting.
|
|--------------------------------------------------------------------------
*/

export function createControlledSchedulerHandleRegistry() {
    let handles =
        [];

    let running =
        false;

    let starts =
        0;

    let stops =
        0;


    function start({
        handleCount,
    } = {}) {
        nonNegativeInteger(
            handleCount,
            "handleCount"
        );


        if (
            running
        ) {
            return Object.freeze({
                started:
                    false,

                reason:
                    "ALREADY_RUNNING",

                handleCount:
                    handles.length,
            });
        }


        handles =
            Array.from(
                {
                    length:
                        handleCount,
                },
                (
                    _,
                    index
                ) =>
                    Object.freeze({
                        id:
                            index +
                            1,
                    })
            );


        running =
            true;

        starts +=
            1;


        return Object.freeze({
            started:
                true,

            reason:
                "STARTED",

            handleCount:
                handles.length,
        });
    }


    function stop() {
        const cleared =
            handles.length;


        handles =
            [];

        running =
            false;

        stops +=
            1;


        return Object.freeze({
            stopped:
                true,

            cleared,

            remaining:
                handles.length,
        });
    }


    function snapshot() {
        return Object.freeze({
            running,

            handleCount:
                handles.length,

            starts,

            stops,
        });
    }


    return Object.freeze({
        start,

        stop,

        snapshot,
    });
}


/*
|--------------------------------------------------------------------------
| Controlled Phase 14.11 scenarios
|--------------------------------------------------------------------------
*/

export async function runSchedulerResilienceBaseline({
    workerDelayMs =
        SCHEDULER_RESILIENCE_DEFAULTS
            .workerDelayMs,

    independentWorkerDelayMs =
        SCHEDULER_RESILIENCE_DEFAULTS
            .independentWorkerDelayMs,
} = {}) {
    validateDelay(
        workerDelayMs
    );

    validateDelay(
        independentWorkerDelayMs
    );


    /*
    |--------------------------------------------------------------------------
    | Same-job overlap
    |--------------------------------------------------------------------------
    */

    const overlapHarness =
        createControlledSchedulerLockHarness();


    let primaryExecutions =
        0;


    const firstRun =
        overlapHarness.runJob({
            jobName:
                "telemetry",

            worker:
                async () => {
                    primaryExecutions +=
                        1;

                    await sleep(
                        workerDelayMs
                    );

                    return {
                        ok:
                            true,
                    };
                },
        });


    await sleep(
        1
    );


    const overlappingRun =
        await overlapHarness.runJob({
            jobName:
                "telemetry",

            worker:
                async () => {
                    primaryExecutions +=
                        1;

                    return {
                        shouldNotExecute:
                            true,
                    };
                },
        });


    const completedFirstRun =
        await firstRun;


    /*
    |--------------------------------------------------------------------------
    | Failure releases lock
    |--------------------------------------------------------------------------
    */

    const failureHarness =
        createControlledSchedulerLockHarness();


    const failedRun =
        await failureHarness.runJob({
            jobName:
                "statistics",

            worker:
                async () => {
                    await sleep(
                        independentWorkerDelayMs
                    );

                    throw new Error(
                        "CONTROLLED_SCHEDULER_FAILURE"
                    );
                },
        });


    const recoveryRun =
        await failureHarness.runJob({
            jobName:
                "statistics",

            worker:
                async () => {
                    await sleep(
                        independentWorkerDelayMs
                    );

                    return {
                        recovered:
                            true,
                    };
                },
        });


    /*
    |--------------------------------------------------------------------------
    | Independent jobs
    |--------------------------------------------------------------------------
    */

    const independentHarness =
        createControlledSchedulerLockHarness();


    const telemetryPromise =
        independentHarness.runJob({
            jobName:
                "telemetry",

            worker:
                async () => {
                    await sleep(
                        independentWorkerDelayMs
                    );

                    return "telemetry-ok";
                },
        });


    const alarmsPromise =
        independentHarness.runJob({
            jobName:
                "alarms",

            worker:
                async () => {
                    await sleep(
                        independentWorkerDelayMs
                    );

                    return "alarms-ok";
                },
        });


    const [
        telemetryResult,
        alarmsResult,
    ] =
        await Promise.all([
            telemetryPromise,
            alarmsPromise,
        ]);


    /*
    |--------------------------------------------------------------------------
    | Stop / restart lifecycle
    |--------------------------------------------------------------------------
    */

    const registry =
        createControlledSchedulerHandleRegistry();


    const initialStart =
        registry.start({
            handleCount:
                10,
        });


    const duplicateStart =
        registry.start({
            handleCount:
                10,
        });


    const firstStop =
        registry.stop();


    const restart =
        registry.start({
            handleCount:
                10,
        });


    const finalStop =
        registry.stop();


    return Object.freeze({
        phase:
            SCHEDULER_RESILIENCE_PHASE,

        layer:
            SCHEDULER_RESILIENCE_LAYER,

        category:
            SCHEDULER_RESILIENCE_CATEGORY,

        controlled:
            true,

        productionSchedulerExecuted:
            false,

        overlap:
            Object.freeze({
                firstRun:
                    completedFirstRun,

                overlappingRun,

                primaryExecutions,

                events:
                    overlapHarness
                        .getEvents(),
            }),

        failureRecovery:
            Object.freeze({
                failedRun,

                recoveryRun,

                finalLocked:
                    failureHarness
                        .isLocked(
                            "statistics"
                        ),

                events:
                    failureHarness
                        .getEvents(),
            }),

        independentJobs:
            Object.freeze({
                telemetry:
                    telemetryResult,

                alarms:
                    alarmsResult,

                events:
                    independentHarness
                        .getEvents(),
            }),

        lifecycle:
            Object.freeze({
                initialStart,

                duplicateStart,

                firstStop,

                restart,

                finalStop,

                finalSnapshot:
                    registry.snapshot(),
            }),

        boundaries:
            SCHEDULER_RESILIENCE_BOUNDARIES,
    });
}