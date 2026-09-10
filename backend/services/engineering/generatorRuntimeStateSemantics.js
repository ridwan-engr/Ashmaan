// services/engineering/generatorRuntimeStateSemantics.js

/*
|--------------------------------------------------------------------------
| Phase 8.5C-B
| Generator Runtime / Operating-State Semantic Qualification
|--------------------------------------------------------------------------
|
| Based strictly on Phase 8.5C-A production evidence.
|
| IMPORTANT:
|
| - Only OBSERVED codes with strong independent correlation are qualified.
| - Unobserved codes remain UNKNOWN.
| - Generator state is not generator availability.
| - Runtime counter type and raw scale are kept distinct.
|--------------------------------------------------------------------------
*/


export const GENERATOR_OPERATING_STATE =
    Object.freeze({

        RUNNING:
            "RUNNING",

        STOPPED:
            "STOPPED",

        UNKNOWN:
            "UNKNOWN",
    });


export const GENERATOR_RUNTIME_SCALE =
    Object.freeze({

        SECONDS:
            "SECONDS",

        UNRESOLVED:
            "UNRESOLVED",
    });


export const GENERATOR_RUNTIME_SEMANTIC_TYPE =
    Object.freeze({

        ACCUMULATED:
            "ACCUMULATED",

        CURRENT_RUN:
            "CURRENT_RUN",

        DAILY_RESETTING:
            "DAILY_RESETTING",

        RESETTING_TIMER:
            "RESETTING_TIMER",

        STATIC_OR_SPARSE:
            "STATIC_OR_SPARSE",

        UNRESOLVED:
            "UNRESOLVED",
    });


/*
|--------------------------------------------------------------------------
| Attribute 416 — Generator status
|--------------------------------------------------------------------------
|
| Production correlation:
|
| code 0:
|   power = 0          72/72
|   speed = 0          72/72
|   active generator    0/72
|
| code 8:
|   power > 0         721/721
|   speed > 0         721/721
|   active generator  544/544
|
| Therefore the observed codes are qualified.
|--------------------------------------------------------------------------
*/

export const GENERATOR_STATUS_416 =
    Object.freeze({

        attributeId:
            416,

        role:
            "PRIMARY_OPERATING_STATE",

        observedCodeMapping:
            Object.freeze({

                0:
                    GENERATOR_OPERATING_STATE
                        .STOPPED,

                8:
                    GENERATOR_OPERATING_STATE
                        .RUNNING,
            }),

        observedCodesQualified:
            true,

        unobservedCodesQualified:
            false,

        confidence:
            "STRONG_EMPIRICAL_CORRELATION",
    });


/*
|--------------------------------------------------------------------------
| Attribute 1166 — Generator state
|--------------------------------------------------------------------------
|
| Production correlation:
|
| code 1:
|   power > 0 39/39
|   source generator 38/38
|
| code 10:
|   power > 0 721/730
|   speed > 0 721/730
|   source generator 544/553
|
| code 0:
|   mixed running/stopped evidence
|
| Therefore:
|
| 1  -> RUNNING supporting evidence
| 10 -> RUNNING supporting evidence
| 0  -> UNKNOWN
|--------------------------------------------------------------------------
*/

export const GENERATOR_STATE_1166 =
    Object.freeze({

        attributeId:
            1166,

        role:
            "SUPPORTING_OPERATING_STATE",

        observedCodeMapping:
            Object.freeze({

                0:
                    GENERATOR_OPERATING_STATE
                        .UNKNOWN,

                1:
                    GENERATOR_OPERATING_STATE
                        .RUNNING,

                10:
                    GENERATOR_OPERATING_STATE
                        .RUNNING,
            }),

        stoppedCodeEstablished:
            false,

        runningCodesEstablished:
            true,

        confidence:
            "EMPIRICALLY_QUALIFIED_FOR_RUNNING_ONLY",
    });


/*
|--------------------------------------------------------------------------
| Runtime attribute semantics
|--------------------------------------------------------------------------
*/

export const GENERATOR_RUNTIME_ATTRIBUTE_SEMANTICS =
    Object.freeze({

        /*
         * Engine operating time.
         *
         * Strongest clean accumulated-runtime evidence:
         * 9/11 series showed positive ~1 raw-unit/s behaviour.
         */

        421:
            Object.freeze({

                attributeId:
                    421,

                name:
                    "Engine operating hours",

                rawScale:
                    GENERATOR_RUNTIME_SCALE
                        .SECONDS,

                semanticType:
                    GENERATOR_RUNTIME_SEMANTIC_TYPE
                        .ACCUMULATED,

                reportingWindowDeltaCandidate:
                    true,

                resetFreeGlobally:
                    false,

                decreaseHandlingRequired:
                    true,

                confidence:
                    "STRONG_EMPIRICAL_SCALE",

                notes:
                    "Despite the parameter name containing 'hours', stored production values behave empirically as seconds.",
            }),


        /*
         * Generator run-time since last start.
         */

        915:
            Object.freeze({

                attributeId:
                    915,

                name:
                    "Generator run-time since last start",

                rawScale:
                    GENERATOR_RUNTIME_SCALE
                        .SECONDS,

                semanticType:
                    GENERATOR_RUNTIME_SEMANTIC_TYPE
                        .CURRENT_RUN,

                reportingWindowDeltaCandidate:
                    false,

                resetFreeGlobally:
                    false,

                decreaseHandlingRequired:
                    true,

                confidence:
                    "STRONG_EMPIRICAL_SCALE",

                notes:
                    "A since-last-start timer must not be treated as a lifetime cumulative counter.",
            }),


        /*
         * Generator start/stop total runtime.
         */

        1029:
            Object.freeze({

                attributeId:
                    1029,

                name:
                    "Total run time",

                rawScale:
                    GENERATOR_RUNTIME_SCALE
                        .SECONDS,

                semanticType:
                    GENERATOR_RUNTIME_SEMANTIC_TYPE
                        .ACCUMULATED,

                reportingWindowDeltaCandidate:
                    true,

                resetFreeGlobally:
                    false,

                decreaseHandlingRequired:
                    true,

                confidence:
                    "STRONG_EMPIRICAL_SCALE",

                notes:
                    "Most qualified positive series behave at 1 raw-unit/s, but decreases exist and must not be silently repaired.",
            }),


        /*
         * Daily runtime.
         */

        1030:
            Object.freeze({

                attributeId:
                    1030,

                name:
                    "Run time today",

                rawScale:
                    GENERATOR_RUNTIME_SCALE
                        .SECONDS,

                semanticType:
                    GENERATOR_RUNTIME_SEMANTIC_TYPE
                        .DAILY_RESETTING,

                reportingWindowDeltaCandidate:
                    false,

                resetFreeGlobally:
                    false,

                decreaseHandlingRequired:
                    true,

                confidence:
                    "STRONG_EMPIRICAL_SCALE",

                notes:
                    "Observed decreases are compatible with a daily/resetting timer; do not use first-last subtraction across arbitrary reporting windows.",
            }),


        /*
         * Tga.
         *
         * Some series behave like seconds, but reset/decrease behaviour
         * is frequent and not uniform enough for primary runtime use.
         */

        1163:
            Object.freeze({

                attributeId:
                    1163,

                name:
                    "Generator run-time",

                rawScale:
                    GENERATOR_RUNTIME_SCALE
                        .SECONDS,

                semanticType:
                    GENERATOR_RUNTIME_SEMANTIC_TYPE
                        .RESETTING_TIMER,

                reportingWindowDeltaCandidate:
                    false,

                resetFreeGlobally:
                    false,

                decreaseHandlingRequired:
                    true,

                confidence:
                    "PARTIAL_EMPIRICAL_SCALE",

                notes:
                    "Frequent decreases and inconsistent series behaviour prevent use as the primary period-runtime counter.",
            }),


        /*
         * Time generator.
         */

        532:
            Object.freeze({

                attributeId:
                    532,

                name:
                    "Time generator",

                rawScale:
                    GENERATOR_RUNTIME_SCALE
                        .UNRESOLVED,

                semanticType:
                    GENERATOR_RUNTIME_SEMANTIC_TYPE
                        .RESETTING_TIMER,

                reportingWindowDeltaCandidate:
                    false,

                resetFreeGlobally:
                    false,

                decreaseHandlingRequired:
                    true,

                confidence:
                    "MIXED_SERIES_BEHAVIOUR",

                notes:
                    "Many series show seconds-like increments, but others show unresolved/minute-like behaviour and frequent decreases.",
            }),


        /*
         * Accumulated generic generator time.
         *
         * High nominal fleet presence but mostly static in the audited
         * production series.
         */

        1018:
            Object.freeze({

                attributeId:
                    1018,

                name:
                    "Accumulated time for generic Generator",

                rawScale:
                    GENERATOR_RUNTIME_SCALE
                        .UNRESOLVED,

                semanticType:
                    GENERATOR_RUNTIME_SEMANTIC_TYPE
                        .STATIC_OR_SPARSE,

                reportingWindowDeltaCandidate:
                    false,

                resetFreeGlobally:
                    true,

                decreaseHandlingRequired:
                    false,

                confidence:
                    "INSUFFICIENT_DYNAMIC_EVIDENCE",

                notes:
                    "64-site presence does not equal runtime observability. Only two series showed positive changes.",
            }),


        1015:
            Object.freeze({

                attributeId:
                    1015,

                name:
                    "Accumulated runtime FischerPanda generators",

                rawScale:
                    GENERATOR_RUNTIME_SCALE
                        .UNRESOLVED,

                semanticType:
                    GENERATOR_RUNTIME_SEMANTIC_TYPE
                        .STATIC_OR_SPARSE,

                reportingWindowDeltaCandidate:
                    false,

                resetFreeGlobally:
                    true,

                decreaseHandlingRequired:
                    false,

                confidence:
                    "INSUFFICIENT_DYNAMIC_EVIDENCE",
            }),
    });


/*
|--------------------------------------------------------------------------
| Runtime source preference
|--------------------------------------------------------------------------
|
| For future 8.5C-C runtime calculation:
|
| 1. qualified state-duration intervals from attr 416
| 2. attr 421 accumulated runtime where series is individually qualified
| 3. attr 1029 accumulated runtime where series is individually qualified
|
| Other timers remain supporting/cross-check evidence.
|--------------------------------------------------------------------------
*/

export const GENERATOR_RUNTIME_SOURCE_PRIORITY =
    Object.freeze([

        Object.freeze({
            type:
                "STATE_INTERVAL",

            attributeId:
                416,
        }),

        Object.freeze({
            type:
                "ACCUMULATED_COUNTER",

            attributeId:
                421,
        }),

        Object.freeze({
            type:
                "ACCUMULATED_COUNTER",

            attributeId:
                1029,
        }),
    ]);


/*
|--------------------------------------------------------------------------
| Semantic boundaries
|--------------------------------------------------------------------------
*/

export const GENERATOR_RUNTIME_STATE_BOUNDARIES =
    Object.freeze({

        ATTRIBUTE_416_OBSERVED_STATE_MAPPING_ESTABLISHED:
            true,

        ATTRIBUTE_416_STOPPED_CODE:
            0,

        ATTRIBUTE_416_RUNNING_CODE:
            8,

        ATTRIBUTE_416_UNOBSERVED_CODES_UNKNOWN:
            true,

        ATTRIBUTE_1166_RUNNING_CODES_ESTABLISHED:
            true,

        ATTRIBUTE_1166_RUNNING_CODES:
            Object.freeze([
                1,
                10,
            ]),

        ATTRIBUTE_1166_CODE_0_IS_STOPPED:
            false,

        ATTRIBUTE_1166_CODE_0_STATE:
            GENERATOR_OPERATING_STATE
                .UNKNOWN,

        ATTRIBUTE_1166_PRIMARY_STATE_SIGNAL:
            false,

        ATTRIBUTE_471_IS_GENERATOR_OPERATING_STATE:
            false,

        ATTRIBUTE_471_IS_AVAILABILITY:
            false,

        RAW_RUNTIME_SECONDS_ESTABLISHED_FOR_421:
            true,

        RAW_RUNTIME_SECONDS_ESTABLISHED_FOR_915:
            true,

        RAW_RUNTIME_SECONDS_ESTABLISHED_FOR_1029:
            true,

        RAW_RUNTIME_SECONDS_ESTABLISHED_FOR_1030:
            true,

        RAW_RUNTIME_SECONDS_ESTABLISHED_GLOBALLY:
            false,

        ATTRIBUTE_1018_RUNTIME_SCALE_ESTABLISHED:
            false,

        ATTRIBUTE_532_RUNTIME_SCALE_ESTABLISHED:
            false,

        ATTRIBUTE_1163_PRIMARY_RUNTIME_SIGNAL:
            false,

        COUNTER_DECREASE_AUTOMATICALLY_MEANS_RESET:
            false,

        COUNTER_DECREASE_AUTOMATICALLY_REPAIRED:
            false,

        ZERO_POWER_MEANS_STOPPED:
            false,

        POSITIVE_POWER_ALONE_MEANS_RUNNING:
            false,

        ACTIVE_SOURCE_GENERATOR_ALONE_MEANS_RUNNING:
            false,

        GENERATOR_RUNNING_MEANS_AVAILABLE:
            false,

        GENERATOR_STOPPED_MEANS_UNAVAILABLE:
            false,

        RUNTIME_CALCULATION_ENGINE_ENABLED:
            false,
    });


/*
|--------------------------------------------------------------------------
| Classification helpers
|--------------------------------------------------------------------------
*/

export function classifyGeneratorStatus416(
    code
) {

    const numeric =
        Number(
            code
        );


    return GENERATOR_STATUS_416
        .observedCodeMapping[
            numeric
        ] ??
        GENERATOR_OPERATING_STATE
            .UNKNOWN;
}


export function classifyGeneratorState1166(
    code
) {

    const numeric =
        Number(
            code
        );


    return GENERATOR_STATE_1166
        .observedCodeMapping[
            numeric
        ] ??
        GENERATOR_OPERATING_STATE
            .UNKNOWN;
}


export function getGeneratorRuntimeSemantic(
    attributeId
) {

    return GENERATOR_RUNTIME_ATTRIBUTE_SEMANTICS[
        Number(
            attributeId
        )
    ] ??
        null;
}


export function isGeneratorAccumulatedRuntimeCandidate(
    attributeId
) {

    const semantic =
        getGeneratorRuntimeSemantic(
            attributeId
        );


    return (
        semantic
            ?.semanticType ===
            GENERATOR_RUNTIME_SEMANTIC_TYPE
                .ACCUMULATED &&
        semantic
            ?.rawScale ===
            GENERATOR_RUNTIME_SCALE
                .SECONDS &&
        semantic
            ?.reportingWindowDeltaCandidate ===
            true
    );
}


export default {

    GENERATOR_OPERATING_STATE,

    GENERATOR_RUNTIME_SCALE,

    GENERATOR_RUNTIME_SEMANTIC_TYPE,

    GENERATOR_STATUS_416,

    GENERATOR_STATE_1166,

    GENERATOR_RUNTIME_ATTRIBUTE_SEMANTICS,

    GENERATOR_RUNTIME_SOURCE_PRIORITY,

    GENERATOR_RUNTIME_STATE_BOUNDARIES,

    classifyGeneratorStatus416,

    classifyGeneratorState1166,

    getGeneratorRuntimeSemantic,

    isGeneratorAccumulatedRuntimeCandidate,
};