// services/financialBi/financialBiInputQualificationService.js

import {
    FINANCIAL_BI_PHASE,
    FINANCIAL_BI_LAYER,
    FINANCIAL_BI_INPUT_STATUS,
    FINANCIAL_BI_VALUE_KIND,
    FINANCIAL_BI_REPORTING_SEMANTICS,
}
    from "./financialBiContract.js";


export const FINANCIAL_BI_INPUT_QUALIFICATION_PHASE =
    "10.2";

export const FINANCIAL_BI_INPUT_QUALIFICATION_LAYER =
    "FINANCIAL_BI";

export const FINANCIAL_BI_INPUT_QUALIFICATION_UPSTREAM_PHASE =
    FINANCIAL_BI_PHASE;


export const FINANCIAL_BI_OBSERVATION_STATUS =
    Object.freeze({
        VALID:
            "VALID",

        INVALID_TIMESTAMP:
            "INVALID_TIMESTAMP",

        OUTSIDE_REPORTING_WINDOW:
            "OUTSIDE_REPORTING_WINDOW",

        INVALID_VALUE:
            "INVALID_VALUE",

        UNIT_MISSING:
            "UNIT_MISSING",

        UNIT_MISMATCH:
            "UNIT_MISMATCH",

        CURRENCY_MISSING:
            "CURRENCY_MISSING",

        CURRENCY_MISMATCH:
            "CURRENCY_MISMATCH",

        DUPLICATE_TIMESTAMP:
            "DUPLICATE_TIMESTAMP",

        SOURCE_KIND_MISMATCH:
            "SOURCE_KIND_MISMATCH",
    });


export const FINANCIAL_BI_INPUT_QUALIFICATION_REASON =
    Object.freeze({
        QUALIFIED:
            "QUALIFIED",

        PARTIALLY_QUALIFIED:
            "PARTIALLY_QUALIFIED",

        NO_OBSERVATIONS:
            "NO_OBSERVATIONS",

        NO_VALID_OBSERVATIONS:
            "NO_VALID_OBSERVATIONS",

        UNIT_UNRESOLVED:
            "UNIT_UNRESOLVED",

        CURRENCY_UNRESOLVED:
            "CURRENCY_UNRESOLVED",

        DUPLICATE_TIMESTAMPS_PRESENT:
            "DUPLICATE_TIMESTAMPS_PRESENT",

        REPORTING_WINDOW_VIOLATION_PRESENT:
            "REPORTING_WINDOW_VIOLATION_PRESENT",

        SOURCE_KIND_MISMATCH_PRESENT:
            "SOURCE_KIND_MISMATCH_PRESENT"
    });


export const FINANCIAL_BI_INPUT_QUALIFICATION_BOUNDARIES =
    Object.freeze({
        reportingWindowPreserved:
            true,

        sourceObservationsPreserved:
            true,

        missingMeansZero:
            false,

        unavailableMeansZero:
            false,

        invalidMeansZero:
            false,

        unitInferenceAllowed:
            false,

        currencyInferenceAllowed:
            false,

        currencyConversionAllowed:
            false,

        resamplingAllowed:
            false,

        interpolationAllowed:
            false,

        outlierRemovalAllowed:
            false,

        duplicateMergeAllowed:
            false,

        calculationIncluded:
            false,

        aggregationIncluded:
            false,

        persistenceIncluded:
            false,

        apiIncluded:
            false,

        dashboardIncluded:
            false,

        optimizationDssIncluded:
            false
    });


function normalizeDate(
    value
) {
    const date =
        value instanceof Date
            ? new Date(
                value.getTime()
            )
            : new Date(
                value
            );

    return Number.isNaN(
        date.getTime()
    )
        ? null
        : date;
}


function isInsideReportingWindow({
    timestamp,
    reportingWindow,
} = {}) {
    return (
        timestamp >=
            reportingWindow.start &&
        timestamp <
            reportingWindow.end
    );
}


function isFiniteNumber(
    value
) {
    return (
        typeof value ===
            "number" &&
        Number.isFinite(
            value
        )
    );
}


function classifyObservation({
    observation,
    metric,
    reportingWindow,
    duplicate,
} = {}) {
    const timestamp =
        normalizeDate(
            observation?.timestamp
        );

    if (
        !timestamp
    ) {
        return {
            status:
                FINANCIAL_BI_OBSERVATION_STATUS.INVALID_TIMESTAMP,

            timestamp:
                null,

            reason:
                "INVALID_TIMESTAMP"
        };
    }

    if (
        !isInsideReportingWindow({
            timestamp,
            reportingWindow,
        })
    ) {
        return {
            status:
                FINANCIAL_BI_OBSERVATION_STATUS.OUTSIDE_REPORTING_WINDOW,

            timestamp,

            reason:
                "OUTSIDE_REPORTING_WINDOW"
        };
    }

    if (
        duplicate
    ) {
        return {
            status:
                FINANCIAL_BI_OBSERVATION_STATUS.DUPLICATE_TIMESTAMP,

            timestamp,

            reason:
                "DUPLICATE_TIMESTAMP"
        };
    }

    if (
        observation?.sourceKind !==
            undefined &&
        observation?.sourceKind !==
            null &&
        observation.sourceKind !==
            metric.sourceKind
    ) {
        return {
            status:
                FINANCIAL_BI_OBSERVATION_STATUS.SOURCE_KIND_MISMATCH,

            timestamp,

            reason:
                "SOURCE_KIND_MISMATCH"
        };
    }

    if (
        !isFiniteNumber(
            observation?.value
        )
    ) {
        return {
            status:
                FINANCIAL_BI_OBSERVATION_STATUS.INVALID_VALUE,

            timestamp,

            reason:
                "INVALID_VALUE"
        };
    }

    if (
        metric.valueKind ===
            FINANCIAL_BI_VALUE_KIND.CURRENCY
    ) {
        if (
            typeof observation?.currency !==
                "string" ||
            !observation.currency.trim()
        ) {
            return {
                status:
                    FINANCIAL_BI_OBSERVATION_STATUS.CURRENCY_MISSING,

                timestamp,

                reason:
                    "CURRENCY_MISSING"
            };
        }

        if (
            observation.currency !==
                metric.currency
        ) {
            return {
                status:
                    FINANCIAL_BI_OBSERVATION_STATUS.CURRENCY_MISMATCH,

                timestamp,

                reason:
                    "CURRENCY_MISMATCH"
            };
        }
    } else if (
        metric.unit
    ) {
        if (
            typeof observation?.unit !==
                "string" ||
            !observation.unit.trim()
        ) {
            return {
                status:
                    FINANCIAL_BI_OBSERVATION_STATUS.UNIT_MISSING,

                timestamp,

                reason:
                    "UNIT_MISSING"
            };
        }

        if (
            observation.unit !==
                metric.unit
        ) {
            return {
                status:
                    FINANCIAL_BI_OBSERVATION_STATUS.UNIT_MISMATCH,

                timestamp,

                reason:
                    "UNIT_MISMATCH"
            };
        }
    }

    return {
        status:
            FINANCIAL_BI_OBSERVATION_STATUS.VALID,

        timestamp,

        reason:
            "VALID"
    };
}


function deriveQualificationReason({
    observations,
    validCount,
    histogram,
    metric,
} = {}) {
    if (
        observations.length ===
            0
    ) {
        return FINANCIAL_BI_INPUT_QUALIFICATION_REASON.NO_OBSERVATIONS;
    }

    if (
        validCount ===
            0
    ) {
        return FINANCIAL_BI_INPUT_QUALIFICATION_REASON.NO_VALID_OBSERVATIONS;
    }

    if (
        histogram[
            FINANCIAL_BI_OBSERVATION_STATUS.CURRENCY_MISSING
        ] ||
        histogram[
            FINANCIAL_BI_OBSERVATION_STATUS.CURRENCY_MISMATCH
        ]
    ) {
        return FINANCIAL_BI_INPUT_QUALIFICATION_REASON.CURRENCY_UNRESOLVED;
    }

    if (
        histogram[
            FINANCIAL_BI_OBSERVATION_STATUS.UNIT_MISSING
        ] ||
        histogram[
            FINANCIAL_BI_OBSERVATION_STATUS.UNIT_MISMATCH
        ]
    ) {
        return FINANCIAL_BI_INPUT_QUALIFICATION_REASON.UNIT_UNRESOLVED;
    }

    if (
        histogram[
            FINANCIAL_BI_OBSERVATION_STATUS.DUPLICATE_TIMESTAMP
        ]
    ) {
        return FINANCIAL_BI_INPUT_QUALIFICATION_REASON.DUPLICATE_TIMESTAMPS_PRESENT;
    }

    if (
        histogram[
            FINANCIAL_BI_OBSERVATION_STATUS.OUTSIDE_REPORTING_WINDOW
        ]
    ) {
        return FINANCIAL_BI_INPUT_QUALIFICATION_REASON.REPORTING_WINDOW_VIOLATION_PRESENT;
    }

    if (
        histogram[
            FINANCIAL_BI_OBSERVATION_STATUS.SOURCE_KIND_MISMATCH
        ]
    ) {
        return FINANCIAL_BI_INPUT_QUALIFICATION_REASON.SOURCE_KIND_MISMATCH_PRESENT;
    }

    if (
        validCount !==
            observations.length
    ) {
        return FINANCIAL_BI_INPUT_QUALIFICATION_REASON.PARTIALLY_QUALIFIED;
    }

    return FINANCIAL_BI_INPUT_QUALIFICATION_REASON.QUALIFIED;
}


export function qualifyFinancialBiInput({
    contract,
    metricName,
    observations,
} = {}) {
    if (
        !contract ||
        contract.phase !==
            FINANCIAL_BI_PHASE ||
        contract.layer !==
            FINANCIAL_BI_LAYER
    ) {
        throw new Error(
            "FINANCIAL_BI_CONTRACT_REQUIRED"
        );
    }

    if (
        contract.reportingWindow?.semantics !==
            FINANCIAL_BI_REPORTING_SEMANTICS
    ) {
        throw new Error(
            "REPORTING_WINDOW_INVALID"
        );
    }

    if (
        typeof metricName !==
            "string" ||
        !metricName.trim()
    ) {
        throw new Error(
            "METRIC_NAME_REQUIRED"
        );
    }

    if (
        !Array.isArray(
            observations
        )
    ) {
        throw new Error(
            "OBSERVATIONS_ARRAY_REQUIRED"
        );
    }

    const metric =
        contract.metrics.find(
            candidate =>
                candidate.name ===
                    metricName
        );

    if (
        !metric
    ) {
        throw new Error(
            "METRIC_NOT_FOUND"
        );
    }

    const timestampCounts =
        new Map();

    for (
        const observation of
        observations
    ) {
        const timestamp =
            normalizeDate(
                observation?.timestamp
            );

        if (
            !timestamp
        ) {
            continue;
        }

        const key =
            timestamp.toISOString();

        timestampCounts.set(
            key,
            (
                timestampCounts.get(
                    key
                ) ??
                0
            ) +
                1
        );
    }

    const qualifiedObservations =
        [];

    const invalidObservations =
        [];

    const histogram =
        {};

    for (
        const observation of
        observations
    ) {
        const timestamp =
            normalizeDate(
                observation?.timestamp
            );

        const duplicate =
            timestamp
                ? (
                    timestampCounts.get(
                        timestamp.toISOString()
                    ) ??
                    0
                ) >
                    1
                : false;

        const classification =
            classifyObservation({
                observation,
                metric,
                reportingWindow:
                    contract.reportingWindow,
                duplicate,
            });

        histogram[
            classification.status
        ] =
            (
                histogram[
                    classification.status
                ] ??
                0
            ) +
            1;

        const result =
            Object.freeze({
                observation,

                status:
                    classification.status,

                reason:
                    classification.reason,

                timestamp:
                    classification.timestamp
            });

        if (
            classification.status ===
                FINANCIAL_BI_OBSERVATION_STATUS.VALID
        ) {
            qualifiedObservations.push(
                result
            );
        } else {
            invalidObservations.push(
                result
            );
        }
    }

    const validCount =
        qualifiedObservations.length;

    const invalidCount =
        invalidObservations.length;

    let status =
        FINANCIAL_BI_INPUT_STATUS.UNAVAILABLE;

    if (
        validCount ===
            observations.length &&
        observations.length >
            0
    ) {
        status =
            FINANCIAL_BI_INPUT_STATUS.QUALIFIED;
    } else if (
        validCount >
            0
    ) {
        status =
            FINANCIAL_BI_INPUT_STATUS.PARTIALLY_QUALIFIED;
    }

    const validTimestamps =
        qualifiedObservations
            .map(
                item =>
                    item.timestamp
            )
            .sort(
                (
                    a,
                    b
                ) =>
                    a -
                    b
            );

    return Object.freeze({
        phase:
            FINANCIAL_BI_INPUT_QUALIFICATION_PHASE,

        layer:
            FINANCIAL_BI_INPUT_QUALIFICATION_LAYER,

        upstreamPhase:
            FINANCIAL_BI_INPUT_QUALIFICATION_UPSTREAM_PHASE,

        contract,

        metric,

        metricName:
            metric.name,

        reportingWindow:
            contract.reportingWindow,

        sourceObservations:
            observations,

        status,

        reason:
            deriveQualificationReason({
                observations,
                validCount,
                histogram,
                metric,
            }),

        expectedUnit:
            metric.unit,

        expectedCurrency:
            metric.currency,

        counts:
            Object.freeze({
                total:
                    observations.length,

                valid:
                    validCount,

                invalid:
                    invalidCount
            }),

        histogram:
            Object.freeze(
                {
                    ...histogram
                }
            ),

        validRange:
            Object.freeze({
                firstTimestamp:
                    validTimestamps.length
                        ? validTimestamps[0]
                        : null,

                lastTimestamp:
                    validTimestamps.length
                        ? validTimestamps[
                            validTimestamps.length -
                                1
                        ]
                        : null
            }),

        qualifiedObservations:
            Object.freeze(
                qualifiedObservations
            ),

        invalidObservations:
            Object.freeze(
                invalidObservations
            ),

        calculation:
            Object.freeze({
                executed:
                    false,

                values:
                    null
            }),

        boundaries:
            FINANCIAL_BI_INPUT_QUALIFICATION_BOUNDARIES
    });
}
