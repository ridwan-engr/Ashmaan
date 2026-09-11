// services/performance/failureRecoveryBaselineService.js

import {
    performance,
} from "node:perf_hooks";


/*
|--------------------------------------------------------------------------
| ASHMAAN
| Phase 14.8 — Graceful Degradation / Failure Recovery
|--------------------------------------------------------------------------
|
| Controlled resilience harness.
|
| This service does NOT:
|
| - call live VRM
| - access MongoDB
| - start or modify the scheduler
| - change authentication / authorization
| - change rate limiting
| - execute equipment control
| - execute automatic dispatch
|
|--------------------------------------------------------------------------
*/


export const FAILURE_RECOVERY_PHASE =
    "14.8";

export const FAILURE_RECOVERY_LAYER =
    "GRACEFUL_DEGRADATION_FAILURE_RECOVERY";

export const FAILURE_RECOVERY_CATEGORY =
    "CONTROLLED_DEPENDENCY_RESILIENCE";


export const FAILURE_RECOVERY_STATUS =
    Object.freeze({
        SUCCESS:
            "SUCCESS",

        FAILED:
            "FAILED",

        TIMED_OUT:
            "TIMED_OUT",

        PARTIAL:
            "PARTIAL",

        UNAVAILABLE:
            "UNAVAILABLE",
    });


export const FAILURE_RECOVERY_REASON =
    Object.freeze({
        COMPLETED:
            "COMPLETED",

        RETRY_RECOVERED:
            "RETRY_RECOVERED",

        ATTEMPTS_EXHAUSTED:
            "ATTEMPTS_EXHAUSTED",

        TIMEOUT:
            "TIMEOUT",

        PARTIAL_FAILURE:
            "PARTIAL_FAILURE",

        MISSING_DEPENDENCY_DATA:
            "MISSING_DEPENDENCY_DATA",

        DEPENDENCY_UNAVAILABLE:
            "DEPENDENCY_UNAVAILABLE",
    });


/*
|--------------------------------------------------------------------------
| Controlled defaults
|--------------------------------------------------------------------------
*/

export const FAILURE_RECOVERY_DEFAULTS =
    Object.freeze({
        timeoutMs:
            50,

        maxAttempts:
            3,

        backoffMs:
            5,

        maxItems:
            25,
    });


/*
|--------------------------------------------------------------------------
| Hard safety bounds
|--------------------------------------------------------------------------
|
| These are resource-safety limits.
| They are NOT arbitrary performance SLA thresholds.
|
|--------------------------------------------------------------------------
*/

export const FAILURE_RECOVERY_LIMITS =
    Object.freeze({
        maxTimeoutMs:
            5000,

        maxAttempts:
            5,

        maxBackoffMs:
            1000,

        maxItems:
            100,
    });


export const FAILURE_RECOVERY_BOUNDARIES =
    Object.freeze({
        gracefulDegradationRequired:
            true,

        timeoutRequired:
            true,

        retryPolicyExplicit:
            true,

        retriesBounded:
            true,

        retryBackoffRequired:
            true,

        permanentFailureCannotRetryForever:
            true,

        dependencyFailureExplicit:
            true,

        partialFailureExplicit:
            true,

        missingMeansZero:
            false,

        unavailableMeansZero:
            false,

        zeroIsValidObservedValue:
            true,

        unitInferenceAllowed:
            false,

        topologyInferenceAllowed:
            false,

        silentInterpolationAllowed:
            false,

        silentResamplingAllowed:
            false,

        performsVrmRequest:
            false,

        performsDatabaseRead:
            false,

        performsDatabaseWrite:
            false,

        startsProductionScheduler:
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

        weakensSecurityHeaders:
            false,

        weakensCors:
            false,

        exposesStackTrace:
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
    timeoutMs,
    maxAttempts,
    backoffMs,
} = {}) {
    positiveInteger(
        timeoutMs,
        "timeoutMs"
    );

    positiveInteger(
        maxAttempts,
        "maxAttempts"
    );

    nonNegativeInteger(
        backoffMs,
        "backoffMs"
    );

    if (
        timeoutMs >
        FAILURE_RECOVERY_LIMITS
            .maxTimeoutMs
    ) {
        throw new RangeError(
            "timeoutMs exceeds the Phase 14.8 safety limit."
        );
    }

    if (
        maxAttempts >
        FAILURE_RECOVERY_LIMITS
            .maxAttempts
    ) {
        throw new RangeError(
            "maxAttempts exceeds the Phase 14.8 safety limit."
        );
    }

    if (
        backoffMs >
        FAILURE_RECOVERY_LIMITS
            .maxBackoffMs
    ) {
        throw new RangeError(
            "backoffMs exceeds the Phase 14.8 safety limit."
        );
    }

    return Object.freeze({
        timeoutMs,
        maxAttempts,
        backoffMs,
    });
}


/*
|--------------------------------------------------------------------------
| Controlled delay
|--------------------------------------------------------------------------
*/

export function controlledDelay(
    delayMs,
    {
        signal = null,
    } = {}
) {
    nonNegativeInteger(
        delayMs,
        "delayMs"
    );

    return new Promise(
        (
            resolve,
            reject
        ) => {
            if (
                signal?.aborted
            ) {
                reject(
                    new Error(
                        "CONTROLLED_OPERATION_ABORTED"
                    )
                );

                return;
            }

            const timer =
                setTimeout(
                    () => {
                        cleanup();
                        resolve();
                    },
                    delayMs
                );

            const onAbort =
                () => {
                    clearTimeout(
                        timer
                    );

                    cleanup();

                    reject(
                        new Error(
                            "CONTROLLED_OPERATION_ABORTED"
                        )
                    );
                };

            const cleanup =
                () => {
                    if (
                        signal
                    ) {
                        signal.removeEventListener(
                            "abort",
                            onAbort
                        );
                    }
                };

            if (
                signal
            ) {
                signal.addEventListener(
                    "abort",
                    onAbort,
                    {
                        once:
                            true,
                    }
                );
            }
        }
    );
}


/*
|--------------------------------------------------------------------------
| Timeout wrapper
|--------------------------------------------------------------------------
*/

export async function executeWithTimeout({
    operation,
    timeoutMs =
        FAILURE_RECOVERY_DEFAULTS
            .timeoutMs,

    attempt =
        1,
} = {}) {
    if (
        typeof operation !==
        "function"
    ) {
        throw new TypeError(
            "operation must be a function."
        );
    }

    positiveInteger(
        timeoutMs,
        "timeoutMs"
    );

    if (
        timeoutMs >
        FAILURE_RECOVERY_LIMITS
            .maxTimeoutMs
    ) {
        throw new RangeError(
            "timeoutMs exceeds the Phase 14.8 safety limit."
        );
    }

    const controller =
        new AbortController();

    let timer =
        null;

    const startedAt =
        performance.now();

    try {
        const timeoutPromise =
            new Promise(
                (
                    _resolve,
                    reject
                ) => {
                    timer =
                        setTimeout(
                            () => {
                                controller.abort();

                                const error =
                                    new Error(
                                        "DEPENDENCY_TIMEOUT"
                                    );

                                error.code =
                                    "DEPENDENCY_TIMEOUT";

                                reject(
                                    error
                                );
                            },
                            timeoutMs
                        );
                }
            );

        const operationPromise =
            Promise.resolve()
                .then(
                    () =>
                        operation({
                            signal:
                                controller.signal,

                            attempt,
                        })
                );

        const value =
            await Promise.race([
                operationPromise,
                timeoutPromise,
            ]);

        return Object.freeze({
            status:
                FAILURE_RECOVERY_STATUS
                    .SUCCESS,

            value,

            timedOut:
                false,

            durationMs:
                performance.now() -
                startedAt,
        });
    } catch (error) {
        const timedOut =
            error?.code ===
                "DEPENDENCY_TIMEOUT";

        return Object.freeze({
            status:
                timedOut
                    ? FAILURE_RECOVERY_STATUS
                        .TIMED_OUT
                    : FAILURE_RECOVERY_STATUS
                        .FAILED,

            value:
                null,

            timedOut,

            error:
                Object.freeze({
                    name:
                        error?.name ??
                        "Error",

                    code:
                        error?.code ??
                        null,

                    message:
                        error?.message ??
                        "Unknown dependency failure",
                }),

            durationMs:
                performance.now() -
                startedAt,
        });
    } finally {
        if (
            timer !==
            null
        ) {
            clearTimeout(
                timer
            );
        }
    }
}


/*
|--------------------------------------------------------------------------
| Retry executor
|--------------------------------------------------------------------------
*/

export async function executeWithBoundedRetry({
    operation,

    timeoutMs =
        FAILURE_RECOVERY_DEFAULTS
            .timeoutMs,

    maxAttempts =
        FAILURE_RECOVERY_DEFAULTS
            .maxAttempts,

    backoffMs =
        FAILURE_RECOVERY_DEFAULTS
            .backoffMs,
} = {}) {
    if (
        typeof operation !==
        "function"
    ) {
        throw new TypeError(
            "operation must be a function."
        );
    }

    const config =
        validateConfiguration({
            timeoutMs,
            maxAttempts,
            backoffMs,
        });

    const attempts =
        [];

    const startedAt =
        performance.now();

    for (
        let attempt = 1;
        attempt <=
        config.maxAttempts;
        attempt +=
        1
    ) {
        const result =
            await executeWithTimeout({
                operation,

                timeoutMs:
                    config.timeoutMs,

                attempt,
            });

        attempts.push({
            attempt,

            status:
                result.status,

            timedOut:
                result.timedOut,

            durationMs:
                result.durationMs,

            error:
                result.error ??
                null,
        });

        if (
            result.status ===
            FAILURE_RECOVERY_STATUS
                .SUCCESS
        ) {
            return Object.freeze({
                status:
                    FAILURE_RECOVERY_STATUS
                        .SUCCESS,

                reason:
                    attempt ===
                    1
                        ? FAILURE_RECOVERY_REASON
                            .COMPLETED
                        : FAILURE_RECOVERY_REASON
                            .RETRY_RECOVERED,

                value:
                    result.value,

                attempts:
                    Object.freeze(
                        attempts
                    ),

                attemptsUsed:
                    attempt,

                exhausted:
                    false,

                totalDurationMs:
                    performance.now() -
                    startedAt,

                config,
            });
        }

        if (
            attempt <
            config.maxAttempts &&
            config.backoffMs >
            0
        ) {
            await controlledDelay(
                config.backoffMs
            );
        }
    }

    const finalAttempt =
        attempts[
            attempts.length -
            1
        ];

    return Object.freeze({
        status:
            finalAttempt
                ?.status ===
                FAILURE_RECOVERY_STATUS
                    .TIMED_OUT
                ? FAILURE_RECOVERY_STATUS
                    .TIMED_OUT
                : FAILURE_RECOVERY_STATUS
                    .FAILED,

        reason:
            finalAttempt
                ?.status ===
                FAILURE_RECOVERY_STATUS
                    .TIMED_OUT
                ? FAILURE_RECOVERY_REASON
                    .TIMEOUT
                : FAILURE_RECOVERY_REASON
                    .ATTEMPTS_EXHAUSTED,

        value:
            null,

        attempts:
            Object.freeze(
                attempts
            ),

        attemptsUsed:
            attempts.length,

        exhausted:
            true,

        totalDurationMs:
            performance.now() -
            startedAt,

        config,
    });
}


/*
|--------------------------------------------------------------------------
| Dependency-value qualification
|--------------------------------------------------------------------------
|
| Explicit zero is valid.
|
| null / undefined is missing and must NOT silently become zero.
|
|--------------------------------------------------------------------------
*/

export function qualifyDependencyValue(
    value
) {
    if (
        value ===
            null ||
        value ===
            undefined
    ) {
        return Object.freeze({
            status:
                FAILURE_RECOVERY_STATUS
                    .UNAVAILABLE,

            reason:
                FAILURE_RECOVERY_REASON
                    .MISSING_DEPENDENCY_DATA,

            value:
                null,

            missing:
                true,

            zero:
                false,
        });
    }

    return Object.freeze({
        status:
            FAILURE_RECOVERY_STATUS
                .SUCCESS,

        reason:
            FAILURE_RECOVERY_REASON
                .COMPLETED,

        value,

        missing:
            false,

        zero:
            value ===
            0,
    });
}


/*
|--------------------------------------------------------------------------
| Bounded batch degradation
|--------------------------------------------------------------------------
|
| Each item is isolated.
|
| A failed item does not fabricate success and does not prevent independent
| items from being evaluated.
|
|--------------------------------------------------------------------------
*/

export async function executeBoundedFailureBatch({
    items,

    worker,

    timeoutMs =
        FAILURE_RECOVERY_DEFAULTS
            .timeoutMs,

    maxAttempts =
        FAILURE_RECOVERY_DEFAULTS
            .maxAttempts,

    backoffMs =
        FAILURE_RECOVERY_DEFAULTS
            .backoffMs,
} = {}) {
    if (
        !Array.isArray(
            items
        )
    ) {
        throw new TypeError(
            "items must be an array."
        );
    }

    if (
        items.length >
        FAILURE_RECOVERY_LIMITS
            .maxItems
    ) {
        throw new RangeError(
            "items exceeds the Phase 14.8 bounded batch limit."
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

    validateConfiguration({
        timeoutMs,
        maxAttempts,
        backoffMs,
    });

    const results =
        [];

    for (
        let index = 0;
        index <
        items.length;
        index +=
        1
    ) {
        const item =
            items[
                index
            ];

        const execution =
            await executeWithBoundedRetry({
                timeoutMs,
                maxAttempts,
                backoffMs,

                operation:
                    ({
                        signal,
                        attempt,
                    }) =>
                        worker({
                            item,
                            index,
                            signal,
                            attempt,
                        }),
            });

        results.push(
            Object.freeze({
                index,

                item,

                status:
                    execution.status,

                reason:
                    execution.reason,

                value:
                    execution.value,

                attemptsUsed:
                    execution
                        .attemptsUsed,

                exhausted:
                    execution
                        .exhausted,
            })
        );
    }

    const successful =
        results.filter(
            (
                item
            ) =>
                item.status ===
                FAILURE_RECOVERY_STATUS
                    .SUCCESS
        ).length;

    const failed =
        results.length -
        successful;

    const status =
        failed ===
        0
            ? FAILURE_RECOVERY_STATUS
                .SUCCESS
            : successful ===
                0
                ? FAILURE_RECOVERY_STATUS
                    .FAILED
                : FAILURE_RECOVERY_STATUS
                    .PARTIAL;

    return Object.freeze({
        status,

        reason:
            status ===
            FAILURE_RECOVERY_STATUS
                .PARTIAL
                ? FAILURE_RECOVERY_REASON
                    .PARTIAL_FAILURE
                : status ===
                    FAILURE_RECOVERY_STATUS
                        .SUCCESS
                    ? FAILURE_RECOVERY_REASON
                        .COMPLETED
                    : FAILURE_RECOVERY_REASON
                        .ATTEMPTS_EXHAUSTED,

        total:
            results.length,

        successful,

        failed,

        results:
            Object.freeze(
                results
            ),
    });
}


/*
|--------------------------------------------------------------------------
| Controlled Phase 14.8 baseline
|--------------------------------------------------------------------------
*/

export async function runFailureRecoveryBaseline() {
    /*
    |--------------------------------------------------------------------------
    | Scenario 1 — immediate success
    |--------------------------------------------------------------------------
    */

    const immediateSuccess =
        await executeWithBoundedRetry({
            operation:
                async () =>
                    42,
        });


    /*
    |--------------------------------------------------------------------------
    | Scenario 2 — transient failure followed by recovery
    |--------------------------------------------------------------------------
    */

    let transientCalls =
        0;

    const transientRecovery =
        await executeWithBoundedRetry({
            operation:
                async () => {
                    transientCalls +=
                        1;

                    if (
                        transientCalls <
                        2
                    ) {
                        throw new Error(
                            "CONTROLLED_TRANSIENT_FAILURE"
                        );
                    }

                    return 17;
                },
        });


    /*
    |--------------------------------------------------------------------------
    | Scenario 3 — permanent failure
    |--------------------------------------------------------------------------
    */

    const permanentFailure =
        await executeWithBoundedRetry({
            operation:
                async () => {
                    throw new Error(
                        "CONTROLLED_PERMANENT_FAILURE"
                    );
                },
        });


    /*
    |--------------------------------------------------------------------------
    | Scenario 4 — timeout
    |--------------------------------------------------------------------------
    */

    const timeout =
        await executeWithBoundedRetry({
            timeoutMs:
                10,

            maxAttempts:
                2,

            backoffMs:
                1,

            operation:
                async ({
                    signal,
                }) => {
                    await controlledDelay(
                        100,
                        {
                            signal,
                        }
                    );

                    return 999;
                },
        });


    /*
    |--------------------------------------------------------------------------
    | Scenario 5 — missing value
    |--------------------------------------------------------------------------
    */

    const missing =
        qualifyDependencyValue(
            null
        );


    /*
    |--------------------------------------------------------------------------
    | Scenario 6 — explicit zero
    |--------------------------------------------------------------------------
    */

    const zero =
        qualifyDependencyValue(
            0
        );


    /*
    |--------------------------------------------------------------------------
    | Scenario 7 — partial bounded batch
    |--------------------------------------------------------------------------
    */

    const partialBatch =
        await executeBoundedFailureBatch({
            items:
                [
                    "A",
                    "B",
                    "C",
                    "D",
                ],

            timeoutMs:
                25,

            maxAttempts:
                2,

            backoffMs:
                1,

            worker:
                async ({
                    item,
                }) => {
                    if (
                        item ===
                        "B"
                    ) {
                        throw new Error(
                            "CONTROLLED_ITEM_FAILURE"
                        );
                    }

                    if (
                        item ===
                        "D"
                    ) {
                        return 0;
                    }

                    return item;
                },
        });


    return Object.freeze({
        phase:
            FAILURE_RECOVERY_PHASE,

        layer:
            FAILURE_RECOVERY_LAYER,

        category:
            FAILURE_RECOVERY_CATEGORY,

        controlled:
            true,

        productionEvidence:
            false,

        scenarios:
            Object.freeze({
                immediateSuccess,

                transientRecovery,

                permanentFailure,

                timeout,

                missing,

                zero,

                partialBatch,
            }),

        boundaries:
            FAILURE_RECOVERY_BOUNDARIES,
    });
}