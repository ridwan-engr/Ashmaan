// services/performance/concurrencyBackpressureBaselineService.js

import {
    performance,
} from "node:perf_hooks";

import {
    runWithConcurrency,
} from "../scheduler/syncJobRunner.js";


/*
|--------------------------------------------------------------------------
| ASHMAAN
| Phase 14.9 — Concurrency / Backpressure Validation
|--------------------------------------------------------------------------
|
| Controlled observation of the existing production concurrency runner.
|
| This service does NOT:
|
| - start the VRM scheduler
| - call VRM
| - read/write MongoDB
| - modify scheduler configuration
| - modify the production runner
| - create an alternative production worker pool
| - execute equipment control
| - execute automatic dispatch
|
|--------------------------------------------------------------------------
*/


export const CONCURRENCY_BACKPRESSURE_PHASE =
    "14.9";

export const CONCURRENCY_BACKPRESSURE_LAYER =
    "CONCURRENCY_BACKPRESSURE";

export const CONCURRENCY_BACKPRESSURE_CATEGORY =
    "BOUNDED_WORKER_EXECUTION";


export const CONCURRENCY_BACKPRESSURE_DEFAULTS =
    Object.freeze({
        itemCount:
            24,

        concurrency:
            3,

        workerDelayMs:
            4,

        delayBetweenStartsMs:
            1,
    });


/*
|--------------------------------------------------------------------------
| Controlled validation limits
|--------------------------------------------------------------------------
|
| Safety bounds for the Phase 14.9 harness.
|
| These are NOT performance SLAs.
|
|--------------------------------------------------------------------------
*/

export const CONCURRENCY_BACKPRESSURE_LIMITS =
    Object.freeze({
        maxItems:
            100,

        maxConcurrency:
            8,

        maxWorkerDelayMs:
            100,

        maxDelayBetweenStartsMs:
            100,
    });


export const CONCURRENCY_BACKPRESSURE_BOUNDARIES =
    Object.freeze({
        productionRunnerUsed:
            true,

        alternativeProductionRunnerCreated:
            false,

        concurrencyMustBeBounded:
            true,

        workerFanOutMustBeBounded:
            true,

        failureIsolationRequired:
            true,

        pacingSupported:
            true,

        schedulerOverlapProtectionRequired:
            true,

        duplicateSchedulerExecutionControlled:
            true,

        unboundedPromiseFanOutAllowed:
            false,

        unboundedQueueAllowed:
            false,

        missingMeansZero:
            false,

        unavailableMeansZero:
            false,

        unitInferenceAllowed:
            false,

        topologyInferenceAllowed:
            false,

        performsVrmRequest:
            false,

        performsDatabaseRead:
            false,

        performsDatabaseWrite:
            false,

        startsProductionScheduler:
            false,

        modifiesProductionRunner:
            false,

        changesSchedulerConfiguration:
            false,

        changesRuntimeConfiguration:
            false,

        bypassesAuthentication:
            false,

        bypassesAuthorization:
            false,

        bypassesInputValidation:
            false,

        bypassesRateLimiting:
            false,

        performsEquipmentControl:
            false,

        performsAutoDispatch:
            false,
    });


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


function validateConfiguration({
    itemCount,
    concurrency,
    workerDelayMs,
    delayBetweenStartsMs,
}) {
    positiveInteger(
        itemCount,
        "itemCount"
    );

    positiveInteger(
        concurrency,
        "concurrency"
    );

    nonNegativeInteger(
        workerDelayMs,
        "workerDelayMs"
    );

    nonNegativeInteger(
        delayBetweenStartsMs,
        "delayBetweenStartsMs"
    );

    if (
        itemCount >
        CONCURRENCY_BACKPRESSURE_LIMITS
            .maxItems
    ) {
        throw new RangeError(
            "itemCount exceeds Phase 14.9 safety limit."
        );
    }

    if (
        concurrency >
        CONCURRENCY_BACKPRESSURE_LIMITS
            .maxConcurrency
    ) {
        throw new RangeError(
            "concurrency exceeds Phase 14.9 safety limit."
        );
    }

    if (
        workerDelayMs >
        CONCURRENCY_BACKPRESSURE_LIMITS
            .maxWorkerDelayMs
    ) {
        throw new RangeError(
            "workerDelayMs exceeds Phase 14.9 safety limit."
        );
    }

    if (
        delayBetweenStartsMs >
        CONCURRENCY_BACKPRESSURE_LIMITS
            .maxDelayBetweenStartsMs
    ) {
        throw new RangeError(
            "delayBetweenStartsMs exceeds Phase 14.9 safety limit."
        );
    }

    return Object.freeze({
        itemCount,
        concurrency,
        workerDelayMs,
        delayBetweenStartsMs,
    });
}


export function controlledWorkerDelay(
    delayMs
) {
    nonNegativeInteger(
        delayMs,
        "delayMs"
    );

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
| Controlled production-runner observation
|--------------------------------------------------------------------------
*/

export async function observeProductionConcurrency({
    itemCount =
        CONCURRENCY_BACKPRESSURE_DEFAULTS
            .itemCount,

    concurrency =
        CONCURRENCY_BACKPRESSURE_DEFAULTS
            .concurrency,

    workerDelayMs =
        CONCURRENCY_BACKPRESSURE_DEFAULTS
            .workerDelayMs,

    delayBetweenStartsMs =
        CONCURRENCY_BACKPRESSURE_DEFAULTS
            .delayBetweenStartsMs,

    failureIndexes =
        [],
} = {}) {
    const config =
        validateConfiguration({
            itemCount,
            concurrency,
            workerDelayMs,
            delayBetweenStartsMs,
        });


    if (
        !Array.isArray(
            failureIndexes
        )
    ) {
        throw new TypeError(
            "failureIndexes must be an array."
        );
    }


    const normalizedFailureIndexes =
        new Set(
            failureIndexes.map(
                (
                    value
                ) => {
                    if (
                        !Number.isInteger(
                            value
                        ) ||
                        value <
                            0 ||
                        value >=
                            config.itemCount
                    ) {
                        throw new RangeError(
                            `Invalid failure index: ${value}`
                        );
                    }

                    return value;
                }
            )
        );


    const items =
        Array.from(
            {
                length:
                    config.itemCount,
            },
            (
                _,
                index
            ) =>
                Object.freeze({
                    index,

                    value:
                        index,
                })
        );


    let activeWorkers =
        0;

    let peakActiveWorkers =
        0;

    let startedWorkers =
        0;

    let completedWorkers =
        0;

    let failedWorkers =
        0;


    const startEvents =
        [];

    const completionEvents =
        [];


    const startedAt =
        performance.now();


    const result =
        await runWithConcurrency({
            items,

            concurrency:
                config.concurrency,

            delayBetweenStartsMs:
                config
                    .delayBetweenStartsMs,

            worker:
                async (
                    item,
                    itemIndex,
                    workerId
                ) => {
                    activeWorkers +=
                        1;

                    startedWorkers +=
                        1;

                    peakActiveWorkers =
                        Math.max(
                            peakActiveWorkers,
                            activeWorkers
                        );


                    startEvents.push(
                        Object.freeze({
                            itemIndex,

                            workerId,

                            activeWorkers,

                            timestampMs:
                                performance.now(),
                        })
                    );


                    try {
                        await controlledWorkerDelay(
                            config
                                .workerDelayMs
                        );


                        if (
                            normalizedFailureIndexes
                                .has(
                                    itemIndex
                                )
                        ) {
                            failedWorkers +=
                                1;

                            throw new Error(
                                `CONTROLLED_WORKER_FAILURE_${itemIndex}`
                            );
                        }


                        return Object.freeze({
                            itemIndex,

                            workerId,

                            value:
                                item.value,
                        });
                    } finally {
                        activeWorkers -=
                            1;

                        completedWorkers +=
                            1;


                        completionEvents.push(
                            Object.freeze({
                                itemIndex,

                                workerId,

                                activeWorkers,

                                timestampMs:
                                    performance.now(),
                            })
                        );
                    }
                },
        });


    const durationMs =
        performance.now() -
        startedAt;


    return Object.freeze({
        phase:
            CONCURRENCY_BACKPRESSURE_PHASE,

        layer:
            CONCURRENCY_BACKPRESSURE_LAYER,

        category:
            CONCURRENCY_BACKPRESSURE_CATEGORY,

        controlled:
            true,

        productionEvidence:
            false,

        productionRunnerUsed:
            true,

        config,

        requestedItems:
            config.itemCount,

        requestedConcurrency:
            config.concurrency,

        theoreticalMaximumWorkers:
            Math.min(
                config.concurrency,
                config.itemCount
            ),

        startedWorkers,

        completedWorkers,

        failedWorkers,

        finalActiveWorkers:
            activeWorkers,

        peakActiveWorkers,

        durationMs,

        startEvents:
            Object.freeze(
                startEvents
            ),

        completionEvents:
            Object.freeze(
                completionEvents
            ),

        runnerResult:
            result,

        boundaries:
            CONCURRENCY_BACKPRESSURE_BOUNDARIES,
    });
}


/*
|--------------------------------------------------------------------------
| Controlled failure-isolation baseline
|--------------------------------------------------------------------------
*/

export async function runConcurrencyBackpressureBaseline() {
    const nominal =
        await observeProductionConcurrency();


    const withFailures =
        await observeProductionConcurrency({
            itemCount:
                12,

            concurrency:
                3,

            workerDelayMs:
                3,

            delayBetweenStartsMs:
                1,

            failureIndexes:
                [
                    2,
                    7,
                    10,
                ],
        });


    const serialized =
        await observeProductionConcurrency({
            itemCount:
                8,

            concurrency:
                1,

            workerDelayMs:
                2,

            delayBetweenStartsMs:
                0,
        });


    const concurrencyGreaterThanItems =
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


    return Object.freeze({
        phase:
            CONCURRENCY_BACKPRESSURE_PHASE,

        layer:
            CONCURRENCY_BACKPRESSURE_LAYER,

        category:
            CONCURRENCY_BACKPRESSURE_CATEGORY,

        controlled:
            true,

        productionEvidence:
            false,

        scenarios:
            Object.freeze({
                nominal,

                withFailures,

                serialized,

                concurrencyGreaterThanItems,
            }),

        boundaries:
            CONCURRENCY_BACKPRESSURE_BOUNDARIES,
    });
}
