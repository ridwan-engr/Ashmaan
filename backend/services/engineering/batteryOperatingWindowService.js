// services/engineering/batteryOperatingWindowService.js


/*
|--------------------------------------------------------------------------
| Phase 8.4F
| Battery Operating-Window Analytics
|--------------------------------------------------------------------------
|
| Pure calculation engine.
|
| An operating-window violation can only be calculated when:
|
| 1. qualified measured telemetry exists
| 2. an explicit applicable engineering window exists
|
| A VRM setting/control/alarm is NOT automatically an engineering window.
|
|--------------------------------------------------------------------------
*/


export const BATTERY_WINDOW_STATUS =
    Object.freeze({

        CALCULATED:
            "CALCULATED",

        PARTIALLY_CALCULATED:
            "PARTIALLY_CALCULATED",

        UNAVAILABLE:
            "UNAVAILABLE",
    });


export const BATTERY_WINDOW_REASON =
    Object.freeze({

        QUALIFIED:
            "QUALIFIED",

        PARTIAL_TEMPORAL_COVERAGE:
            "PARTIAL_TEMPORAL_COVERAGE",

        OPERATING_WINDOW_NOT_ESTABLISHED:
            "OPERATING_WINDOW_NOT_ESTABLISHED",

        SIGNAL_NOT_OBSERVED:
            "SIGNAL_NOT_OBSERVED",

        INSUFFICIENT_QUALIFIED_SAMPLES:
            "INSUFFICIENT_QUALIFIED_SAMPLES",

        INVALID_REPORTING_WINDOW:
            "INVALID_REPORTING_WINDOW",

        INVALID_OPERATING_WINDOW:
            "INVALID_OPERATING_WINDOW",
    });


export const BATTERY_WINDOW_SIGNAL =
    Object.freeze({

        SOC:
            "SOC",

        VOLTAGE:
            "VOLTAGE",

        TEMPERATURE:
            "TEMPERATURE",
    });


export const DEFAULT_BATTERY_WINDOW_CONFIG =
    Object.freeze({

        maxInterpolationGapMinutes:
            30,

        minimumSamples:
            2,

        goodCoveragePercent:
            80,

        partialCoveragePercent:
            20,
    });


export const BATTERY_OPERATING_WINDOW_BOUNDARIES =
    Object.freeze({

        VRM_SETTING_AUTOMATICALLY_ENGINEERING_LIMIT:
            false,

        VRM_ALARM_AUTOMATICALLY_ENGINEERING_LIMIT:
            false,

        ESS_MINIMUM_SOC_UNCONDITIONALLY_APPLICABLE:
            false,

        BMS_CURRENT_LIMIT_AS_CONTINUOUS_WINDOW:
            false,

        BMS_VOLTAGE_LIMIT_AS_SYMMETRIC_WINDOW:
            false,

        MISSING_LIMIT_MEANS_ZERO:
            false,

        MISSING_TELEMETRY_MEANS_ZERO:
            false,

        VIOLATION_WITHOUT_ESTABLISHED_WINDOW:
            false,
    });


function finite(
    value
) {

    const number =
        Number(
            value
        );


    return Number.isFinite(
        number
    )
        ? number
        : null;
}


function asDate(
    value
) {

    const date =
        value instanceof Date
            ? value
            : new Date(
                value
            );


    return Number.isNaN(
        date.getTime()
    )
        ? null
        : date;
}


function round(
    value,
    decimals = 6
) {

    return Number.isFinite(
        value
    )
        ? Number(
            value.toFixed(
                decimals
            )
        )
        : null;
}


function validateReportingWindow(
    start,
    end
) {

    const startDate =
        asDate(
            start
        );

    const endDate =
        asDate(
            end
        );


    if (
        !startDate ||
        !endDate ||
        endDate <=
            startDate
    ) {

        return null;
    }


    return {

        start:
            startDate,

        end:
            endDate,

        semantics:
            "[start,end)",
    };
}


function validateEngineeringWindow(
    window
) {

    if (
        !window ||
        typeof window !==
            "object"
    ) {

        return null;
    }


    const minimum =
        finite(
            window.minimum
        );

    const maximum =
        finite(
            window.maximum
        );


    if (
        minimum ===
            null ||
        maximum ===
            null ||
        maximum <
            minimum
    ) {

        return null;
    }


    return {

        minimum,

        maximum,

        unit:
            window.unit ??
            null,

        source:
            window.source ??
            null,

        applicability:
            window.applicability ??
            null,

        evidenceBasis:
            window.evidenceBasis ??
            "ENGINEERING_CONFIGURATION",
    };
}


function prepareSeries({
    samples,
    reportingWindow,
} = {}) {

    return (
        samples ??
        []
    )
        .map(
            (
                sample
            ) => {

                const timestamp =
                    asDate(
                        sample
                            ?.timestamp
                    );

                const value =
                    finite(
                        sample
                            ?.value ??
                        sample
                            ?.numericValue
                    );


                if (
                    !timestamp ||
                    value ===
                        null ||
                    timestamp <
                        reportingWindow.start ||
                    timestamp >=
                        reportingWindow.end
                ) {

                    return null;
                }


                return {

                    timestamp,

                    value,
                };
            }
        )
        .filter(
            Boolean
        )
        .sort(
            (
                a,
                b
            ) =>
                a.timestamp -
                b.timestamp
        );
}


function classifyValue(
    value,
    window
) {

    if (
        value <
        window.minimum
    ) {

        return "BELOW";
    }


    if (
        value >
        window.maximum
    ) {

        return "ABOVE";
    }


    return "WITHIN";
}


export function calculateBatteryOperatingWindow({
    signal,
    samples = [],
    start,
    end,
    operatingWindow,
    config = {},
} = {}) {

    const effectiveConfig = {

        ...DEFAULT_BATTERY_WINDOW_CONFIG,

        ...config,
    };


    const reportingWindow =
        validateReportingWindow(
            start,
            end
        );


    if (!reportingWindow) {

        return {

            signal,

            status:
                BATTERY_WINDOW_STATUS
                    .UNAVAILABLE,

            reason:
                BATTERY_WINDOW_REASON
                    .INVALID_REPORTING_WINDOW,

            metrics:
                null,

            reportingWindow:
                null,

            operatingWindow:
                null,

            boundaries:
                BATTERY_OPERATING_WINDOW_BOUNDARIES,
        };
    }


    if (!operatingWindow) {

        return {

            signal,

            status:
                BATTERY_WINDOW_STATUS
                    .UNAVAILABLE,

            reason:
                BATTERY_WINDOW_REASON
                    .OPERATING_WINDOW_NOT_ESTABLISHED,

            metrics:
                null,

            reportingWindow,

            operatingWindow:
                null,

            boundaries:
                BATTERY_OPERATING_WINDOW_BOUNDARIES,
        };
    }


    const qualifiedWindow =
        validateEngineeringWindow(
            operatingWindow
        );


    if (!qualifiedWindow) {

        return {

            signal,

            status:
                BATTERY_WINDOW_STATUS
                    .UNAVAILABLE,

            reason:
                BATTERY_WINDOW_REASON
                    .INVALID_OPERATING_WINDOW,

            metrics:
                null,

            reportingWindow,

            operatingWindow:
                null,

            boundaries:
                BATTERY_OPERATING_WINDOW_BOUNDARIES,
        };
    }


    const series =
        prepareSeries({

            samples,

            reportingWindow,
        });


    if (
        series.length <
        effectiveConfig
            .minimumSamples
    ) {

        return {

            signal,

            status:
                BATTERY_WINDOW_STATUS
                    .UNAVAILABLE,

            reason:
                samples.length >
                0
                    ? BATTERY_WINDOW_REASON
                        .INSUFFICIENT_QUALIFIED_SAMPLES
                    : BATTERY_WINDOW_REASON
                        .SIGNAL_NOT_OBSERVED,

            metrics:
                null,

            reportingWindow,

            operatingWindow:
                qualifiedWindow,

            boundaries:
                BATTERY_OPERATING_WINDOW_BOUNDARIES,
        };
    }


    const maxGapSeconds =
        effectiveConfig
            .maxInterpolationGapMinutes *
        60;


    let observedSeconds =
        0;

    let belowSeconds =
        0;

    let aboveSeconds =
        0;

    let withinSeconds =
        0;

    let qualifiedIntervals =
        0;

    let violationIntervals =
        0;


    for (
        let index = 1;
        index <
            series.length;
        index +=
            1
    ) {

        const previous =
            series[
                index -
                1
            ];

        const current =
            series[
                index
            ];


        const gapSeconds =
            (
                current.timestamp -
                previous.timestamp
            ) /
            1000;


        if (
            gapSeconds <=
                0 ||
            gapSeconds >
                maxGapSeconds
        ) {

            continue;
        }


        /*
         * Piecewise-constant classification.
         *
         * The state measured at the beginning of the interval is treated
         * as representative until the next qualified sample.
         *
         * This deliberately avoids interpolating boundary crossings that
         * are not actually observed.
         */

        const classification =
            classifyValue(
                previous.value,
                qualifiedWindow
            );


        observedSeconds +=
            gapSeconds;

        qualifiedIntervals +=
            1;


        if (
            classification ===
            "BELOW"
        ) {

            belowSeconds +=
                gapSeconds;

            violationIntervals +=
                1;

        }
        else if (
            classification ===
            "ABOVE"
        ) {

            aboveSeconds +=
                gapSeconds;

            violationIntervals +=
                1;

        }
        else {

            withinSeconds +=
                gapSeconds;
        }
    }


    if (
        observedSeconds <=
        0
    ) {

        return {

            signal,

            status:
                BATTERY_WINDOW_STATUS
                    .UNAVAILABLE,

            reason:
                BATTERY_WINDOW_REASON
                    .INSUFFICIENT_QUALIFIED_SAMPLES,

            metrics:
                null,

            reportingWindow,

            operatingWindow:
                qualifiedWindow,

            boundaries:
                BATTERY_OPERATING_WINDOW_BOUNDARIES,
        };
    }


    const reportingSeconds =
        (
            reportingWindow.end -
            reportingWindow.start
        ) /
        1000;


    const coveragePercent =
        observedSeconds /
        reportingSeconds *
        100;


    let status =
        BATTERY_WINDOW_STATUS
            .UNAVAILABLE;


    let reason =
        BATTERY_WINDOW_REASON
            .INSUFFICIENT_QUALIFIED_SAMPLES;


    if (
        coveragePercent >=
        effectiveConfig
            .goodCoveragePercent
    ) {

        status =
            BATTERY_WINDOW_STATUS
                .CALCULATED;

        reason =
            BATTERY_WINDOW_REASON
                .QUALIFIED;

    }
    else if (
        coveragePercent >=
        effectiveConfig
            .partialCoveragePercent
    ) {

        status =
            BATTERY_WINDOW_STATUS
                .PARTIALLY_CALCULATED;

        reason =
            BATTERY_WINDOW_REASON
                .PARTIAL_TEMPORAL_COVERAGE;
    }


    if (
        status ===
        BATTERY_WINDOW_STATUS
            .UNAVAILABLE
    ) {

        return {

            signal,

            status,

            reason,

            metrics:
                null,

            reportingWindow,

            operatingWindow:
                qualifiedWindow,

            boundaries:
                BATTERY_OPERATING_WINDOW_BOUNDARIES,
        };
    }


    const violationSeconds =
        belowSeconds +
        aboveSeconds;


    return {

        signal,

        status,

        reason,

        reportingWindow,

        operatingWindow:
            qualifiedWindow,

        metrics: {

            sampleCount:
                series.length,

            qualifiedIntervals,

            violationIntervals,

            observedHours:
                round(
                    observedSeconds /
                    3600
                ),

            temporalCoveragePercent:
                round(
                    coveragePercent,
                    3
                ),

            belowWindowHours:
                round(
                    belowSeconds /
                    3600
                ),

            aboveWindowHours:
                round(
                    aboveSeconds /
                    3600
                ),

            withinWindowHours:
                round(
                    withinSeconds /
                    3600
                ),

            violationHours:
                round(
                    violationSeconds /
                    3600
                ),

            violationPercentOfObservedTime:
                round(
                    violationSeconds /
                    observedSeconds *
                    100,
                    3
                ),

            withinWindowPercentOfObservedTime:
                round(
                    withinSeconds /
                    observedSeconds *
                    100,
                    3
                ),

            anyViolationObserved:
                violationSeconds >
                0,
        },

        boundaries:
            BATTERY_OPERATING_WINDOW_BOUNDARIES,
    };
}
