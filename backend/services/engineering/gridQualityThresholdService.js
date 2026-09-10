// services/engineering/gridQualityThresholdService.js

/*
|--------------------------------------------------------------------------
| Phase 8.6G-G
| Grid Quality Threshold / Status Framework
|--------------------------------------------------------------------------
|
| PURPOSE
|
| Apply explicitly configured operational thresholds to already-qualified
| engineering analytics values.
|
| This service does NOT define default electrical standards.
|
| No IEC / IEEE / EN / NERC / utility threshold is silently assumed.
|--------------------------------------------------------------------------
*/


export const GRID_QUALITY_CLASSIFICATION = Object.freeze({
    NORMAL:
        "NORMAL",

    BELOW_LIMIT:
        "BELOW_LIMIT",

    ABOVE_LIMIT:
        "ABOVE_LIMIT",

    OUTSIDE_LIMIT:
        "OUTSIDE_LIMIT",

    UNAVAILABLE:
        "UNAVAILABLE",
});


export const GRID_QUALITY_THRESHOLD_STATUS = Object.freeze({
    CALCULATED:
        "CALCULATED",

    PARTIALLY_CALCULATED:
        "PARTIALLY_CALCULATED",

    UNAVAILABLE:
        "UNAVAILABLE",
});


export const GRID_QUALITY_THRESHOLD_REASON = Object.freeze({
    THRESHOLD_CLASSIFICATION_QUALIFIED:
        "THRESHOLD_CLASSIFICATION_QUALIFIED",

    THRESHOLD_CLASSIFICATION_PARTIAL:
        "THRESHOLD_CLASSIFICATION_PARTIAL",

    NO_THRESHOLD_PROFILE:
        "NO_THRESHOLD_PROFILE",

    INVALID_THRESHOLD_PROFILE:
        "INVALID_THRESHOLD_PROFILE",

    METRIC_NOT_CONFIGURED:
        "METRIC_NOT_CONFIGURED",

    METRIC_VALUE_UNAVAILABLE:
        "METRIC_VALUE_UNAVAILABLE",
});


export const GRID_QUALITY_THRESHOLD_METRIC = Object.freeze({
    VOLTAGE:
        "VOLTAGE",

    FREQUENCY:
        "FREQUENCY",

    VOLTAGE_UNBALANCE_PERCENT:
        "VOLTAGE_UNBALANCE_PERCENT",

    CURRENT_UNBALANCE_PERCENT:
        "CURRENT_UNBALANCE_PERCENT",
});


export const GRID_QUALITY_THRESHOLD_TYPE = Object.freeze({
    RANGE:
        "RANGE",

    MAXIMUM:
        "MAXIMUM",
});


/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

function finiteNumber(value) {
    return (
        typeof value === "number" &&
        Number.isFinite(value)
    )
        ? value
        : null;
}


function nonEmptyString(value) {
    if (
        typeof value !== "string"
    ) {
        return null;
    }

    const normalized =
        value.trim();

    return normalized ||
        null;
}


/*
|--------------------------------------------------------------------------
| Threshold profile validation
|--------------------------------------------------------------------------
|
| Example:
|
| {
|     id: "SITE_OPERATIONAL_PROFILE",
|     sourceType: "CONFIGURED_OPERATIONAL",
|     standardReference: null,
|
|     voltage: {
|         minimum: ...,
|         maximum: ...,
|     },
|
|     frequency: {
|         minimum: ...,
|         maximum: ...,
|     },
|
|     voltageUnbalancePercent: {
|         maximum: ...,
|     },
|
|     currentUnbalancePercent: {
|         maximum: ...,
|     }
| }
|--------------------------------------------------------------------------
*/

export function validateGridQualityThresholdProfile(
    profile
) {
    if (
        !profile ||
        typeof profile !== "object" ||
        Array.isArray(profile)
    ) {
        return {
            valid: false,
            errors: [
                "Threshold profile must be an object.",
            ],
        };
    }

    const errors = [];

    if (
        !nonEmptyString(profile.id)
    ) {
        errors.push(
            "Threshold profile id is required."
        );
    }


    function validateRange(
        key,
        definition
    ) {
        if (
            definition === null ||
            definition === undefined
        ) {
            return;
        }

        if (
            typeof definition !== "object" ||
            Array.isArray(definition)
        ) {
            errors.push(
                `${key} threshold must be an object.`
            );

            return;
        }

        const minimum =
            finiteNumber(
                definition.minimum
            );

        const maximum =
            finiteNumber(
                definition.maximum
            );

        if (
            minimum === null ||
            maximum === null
        ) {
            errors.push(
                `${key} threshold requires finite minimum and maximum values.`
            );

            return;
        }

        if (
            minimum >= maximum
        ) {
            errors.push(
                `${key} minimum must be lower than maximum.`
            );
        }
    }


    function validateMaximum(
        key,
        definition
    ) {
        if (
            definition === null ||
            definition === undefined
        ) {
            return;
        }

        if (
            typeof definition !== "object" ||
            Array.isArray(definition)
        ) {
            errors.push(
                `${key} threshold must be an object.`
            );

            return;
        }

        const maximum =
            finiteNumber(
                definition.maximum
            );

        if (
            maximum === null
        ) {
            errors.push(
                `${key} threshold requires a finite maximum value.`
            );

            return;
        }

        if (
            maximum < 0
        ) {
            errors.push(
                `${key} maximum cannot be negative.`
            );
        }
    }


    validateRange(
        "voltage",
        profile.voltage
    );

    validateRange(
        "frequency",
        profile.frequency
    );

    validateMaximum(
        "voltageUnbalancePercent",
        profile.voltageUnbalancePercent
    );

    validateMaximum(
        "currentUnbalancePercent",
        profile.currentUnbalancePercent
    );


    const configuredMetricCount =
        [
            profile.voltage,
            profile.frequency,
            profile.voltageUnbalancePercent,
            profile.currentUnbalancePercent,
        ]
            .filter(
                (
                    value
                ) =>
                    value !== null &&
                    value !== undefined
            )
            .length;


    if (
        configuredMetricCount === 0
    ) {
        errors.push(
            "Threshold profile must configure at least one metric."
        );
    }


    return {
        valid:
            errors.length === 0,

        errors,
    };
}


/*
|--------------------------------------------------------------------------
| Normalize profile
|--------------------------------------------------------------------------
*/

export function normalizeGridQualityThresholdProfile(
    profile
) {
    const validation =
        validateGridQualityThresholdProfile(
            profile
        );


    if (
        validation.valid !== true
    ) {
        return {
            valid: false,

            profile: null,

            errors:
                validation.errors,
        };
    }


    return {
        valid: true,

        errors: [],

        profile: {
            id:
                profile.id.trim(),

            label:
                nonEmptyString(
                    profile.label
                ),

            sourceType:
                nonEmptyString(
                    profile.sourceType
                ) ??
                "CONFIGURED_OPERATIONAL",

            standardReference:
                nonEmptyString(
                    profile.standardReference
                ),

            validatedStandardProfile:
                profile
                    .validatedStandardProfile ===
                true,

            voltage:
                profile.voltage
                    ? {
                        type:
                            GRID_QUALITY_THRESHOLD_TYPE
                                .RANGE,

                        minimum:
                            profile
                                .voltage
                                .minimum,

                        maximum:
                            profile
                                .voltage
                                .maximum,
                    }
                    : null,

            frequency:
                profile.frequency
                    ? {
                        type:
                            GRID_QUALITY_THRESHOLD_TYPE
                                .RANGE,

                        minimum:
                            profile
                                .frequency
                                .minimum,

                        maximum:
                            profile
                                .frequency
                                .maximum,
                    }
                    : null,

            voltageUnbalancePercent:
                profile.voltageUnbalancePercent
                    ? {
                        type:
                            GRID_QUALITY_THRESHOLD_TYPE
                                .MAXIMUM,

                        maximum:
                            profile
                                .voltageUnbalancePercent
                                .maximum,
                    }
                    : null,

            currentUnbalancePercent:
                profile.currentUnbalancePercent
                    ? {
                        type:
                            GRID_QUALITY_THRESHOLD_TYPE
                                .MAXIMUM,

                        maximum:
                            profile
                                .currentUnbalancePercent
                                .maximum,
                    }
                    : null,
        },
    };
}


/*
|--------------------------------------------------------------------------
| Resolve metric definition
|--------------------------------------------------------------------------
*/

function resolveThresholdDefinition({
    metric,
    profile,
}) {
    switch (metric) {
        case GRID_QUALITY_THRESHOLD_METRIC
            .VOLTAGE:

            return profile.voltage;


        case GRID_QUALITY_THRESHOLD_METRIC
            .FREQUENCY:

            return profile.frequency;


        case GRID_QUALITY_THRESHOLD_METRIC
            .VOLTAGE_UNBALANCE_PERCENT:

            return profile
                .voltageUnbalancePercent;


        case GRID_QUALITY_THRESHOLD_METRIC
            .CURRENT_UNBALANCE_PERCENT:

            return profile
                .currentUnbalancePercent;


        default:

            return null;
    }
}


/*
|--------------------------------------------------------------------------
| Range classification
|--------------------------------------------------------------------------
*/

export function classifyRangeMetric({
    value,
    minimum,
    maximum,
} = {}) {
    const numericValue =
        finiteNumber(value);

    const minimumValue =
        finiteNumber(minimum);

    const maximumValue =
        finiteNumber(maximum);


    if (
        numericValue === null ||
        minimumValue === null ||
        maximumValue === null
    ) {
        return {
            classification:
                GRID_QUALITY_CLASSIFICATION
                    .UNAVAILABLE,

            withinLimits:
                null,
        };
    }


    if (
        numericValue <
        minimumValue
    ) {
        return {
            classification:
                GRID_QUALITY_CLASSIFICATION
                    .BELOW_LIMIT,

            withinLimits:
                false,
        };
    }


    if (
        numericValue >
        maximumValue
    ) {
        return {
            classification:
                GRID_QUALITY_CLASSIFICATION
                    .ABOVE_LIMIT,

            withinLimits:
                false,
        };
    }


    return {
        classification:
            GRID_QUALITY_CLASSIFICATION
                .NORMAL,

        withinLimits:
            true,
    };
}


/*
|--------------------------------------------------------------------------
| Maximum classification
|--------------------------------------------------------------------------
*/

export function classifyMaximumMetric({
    value,
    maximum,
} = {}) {
    const numericValue =
        finiteNumber(value);

    const maximumValue =
        finiteNumber(maximum);


    if (
        numericValue === null ||
        maximumValue === null
    ) {
        return {
            classification:
                GRID_QUALITY_CLASSIFICATION
                    .UNAVAILABLE,

            withinLimits:
                null,
        };
    }


    if (
        numericValue >
        maximumValue
    ) {
        return {
            classification:
                GRID_QUALITY_CLASSIFICATION
                    .ABOVE_LIMIT,

            withinLimits:
                false,
        };
    }


    return {
        classification:
            GRID_QUALITY_CLASSIFICATION
                .NORMAL,

        withinLimits:
            true,
    };
}


/*
|--------------------------------------------------------------------------
| Single metric classification
|--------------------------------------------------------------------------
*/

export function classifyGridQualityMetric({
    metric,
    value,
    profile,
} = {}) {
    const normalized =
        normalizeGridQualityThresholdProfile(
            profile
        );


    if (
        normalized.valid !== true
    ) {
        return {
            metric,

            value:
                finiteNumber(value),

            status:
                GRID_QUALITY_THRESHOLD_STATUS
                    .UNAVAILABLE,

            reason:
                GRID_QUALITY_THRESHOLD_REASON
                    .INVALID_THRESHOLD_PROFILE,

            classification:
                GRID_QUALITY_CLASSIFICATION
                    .UNAVAILABLE,

            withinLimits:
                null,

            threshold:
                null,

            profile:
                null,
        };
    }


    const definition =
        resolveThresholdDefinition({
            metric,

            profile:
                normalized.profile,
        });


    if (
        !definition
    ) {
        return {
            metric,

            value:
                finiteNumber(value),

            status:
                GRID_QUALITY_THRESHOLD_STATUS
                    .UNAVAILABLE,

            reason:
                GRID_QUALITY_THRESHOLD_REASON
                    .METRIC_NOT_CONFIGURED,

            classification:
                GRID_QUALITY_CLASSIFICATION
                    .UNAVAILABLE,

            withinLimits:
                null,

            threshold:
                null,

            profile: {
                id:
                    normalized
                        .profile
                        .id,

                sourceType:
                    normalized
                        .profile
                        .sourceType,

                standardReference:
                    normalized
                        .profile
                        .standardReference,

                validatedStandardProfile:
                    normalized
                        .profile
                        .validatedStandardProfile,
            },
        };
    }


    const numericValue =
        finiteNumber(
            value
        );


    if (
        numericValue === null
    ) {
        return {
            metric,

            value:
                null,

            status:
                GRID_QUALITY_THRESHOLD_STATUS
                    .UNAVAILABLE,

            reason:
                GRID_QUALITY_THRESHOLD_REASON
                    .METRIC_VALUE_UNAVAILABLE,

            classification:
                GRID_QUALITY_CLASSIFICATION
                    .UNAVAILABLE,

            withinLimits:
                null,

            threshold:
                definition,

            profile: {
                id:
                    normalized
                        .profile
                        .id,

                sourceType:
                    normalized
                        .profile
                        .sourceType,

                standardReference:
                    normalized
                        .profile
                        .standardReference,

                validatedStandardProfile:
                    normalized
                        .profile
                        .validatedStandardProfile,
            },
        };
    }


    const result =
        definition.type ===
        GRID_QUALITY_THRESHOLD_TYPE.RANGE
            ? classifyRangeMetric({
                value:
                    numericValue,

                minimum:
                    definition.minimum,

                maximum:
                    definition.maximum,
            })
            : classifyMaximumMetric({
                value:
                    numericValue,

                maximum:
                    definition.maximum,
            });


    return {
        metric,

        value:
            numericValue,

        status:
            GRID_QUALITY_THRESHOLD_STATUS
                .CALCULATED,

        reason:
            GRID_QUALITY_THRESHOLD_REASON
                .THRESHOLD_CLASSIFICATION_QUALIFIED,

        classification:
            result.classification,

        withinLimits:
            result.withinLimits,

        threshold:
            definition,

        profile: {
            id:
                normalized
                    .profile
                    .id,

            sourceType:
                normalized
                    .profile
                    .sourceType,

            standardReference:
                normalized
                    .profile
                    .standardReference,

            validatedStandardProfile:
                normalized
                    .profile
                    .validatedStandardProfile,
        },

        semantics:
            buildSemantics(
                normalized.profile
            ),
    };
}


/*
|--------------------------------------------------------------------------
| Batch classification
|--------------------------------------------------------------------------
*/

export function classifyGridQualityMetrics({
    metrics = [],
    profile = null,
} = {}) {
    if (
        !profile
    ) {
        return {
            family:
                "GRID_QUALITY_THRESHOLD_STATUS",

            status:
                GRID_QUALITY_THRESHOLD_STATUS
                    .UNAVAILABLE,

            reason:
                GRID_QUALITY_THRESHOLD_REASON
                    .NO_THRESHOLD_PROFILE,

            results:
                [],

            semantics:
                buildSemantics(
                    null
                ),
        };
    }


    const normalized =
        normalizeGridQualityThresholdProfile(
            profile
        );


    if (
        normalized.valid !== true
    ) {
        return {
            family:
                "GRID_QUALITY_THRESHOLD_STATUS",

            status:
                GRID_QUALITY_THRESHOLD_STATUS
                    .UNAVAILABLE,

            reason:
                GRID_QUALITY_THRESHOLD_REASON
                    .INVALID_THRESHOLD_PROFILE,

            errors:
                normalized.errors,

            results:
                [],

            semantics:
                buildSemantics(
                    null
                ),
        };
    }


    const results =
        metrics.map(
            (
                metric
            ) =>
                classifyGridQualityMetric({
                    metric:
                        metric.metric,

                    value:
                        metric.value,

                    profile:
                        normalized.profile,
                })
        );


    const calculatedCount =
        results.filter(
            (
                result
            ) =>
                result.status ===
                GRID_QUALITY_THRESHOLD_STATUS
                    .CALCULATED
        )
            .length;


    const unavailableCount =
        results.length -
        calculatedCount;


    const status =
        calculatedCount === 0
            ? GRID_QUALITY_THRESHOLD_STATUS
                .UNAVAILABLE
            : unavailableCount === 0
                ? GRID_QUALITY_THRESHOLD_STATUS
                    .CALCULATED
                : GRID_QUALITY_THRESHOLD_STATUS
                    .PARTIALLY_CALCULATED;


    const reason =
        status ===
        GRID_QUALITY_THRESHOLD_STATUS
            .CALCULATED
            ? GRID_QUALITY_THRESHOLD_REASON
                .THRESHOLD_CLASSIFICATION_QUALIFIED
            : status ===
                GRID_QUALITY_THRESHOLD_STATUS
                    .PARTIALLY_CALCULATED
                ? GRID_QUALITY_THRESHOLD_REASON
                    .THRESHOLD_CLASSIFICATION_PARTIAL
                : GRID_QUALITY_THRESHOLD_REASON
                    .METRIC_VALUE_UNAVAILABLE;


    return {
        family:
            "GRID_QUALITY_THRESHOLD_STATUS",

        status,

        reason,

        results,

        metrics: {
            requestedMetricCount:
                metrics.length,

            calculatedMetricCount:
                calculatedCount,

            unavailableMetricCount:
                unavailableCount,

            withinLimitsCount:
                results.filter(
                    (
                        result
                    ) =>
                        result
                            .withinLimits ===
                        true
                )
                    .length,

            outsideLimitsCount:
                results.filter(
                    (
                        result
                    ) =>
                        result
                            .withinLimits ===
                        false
                )
                    .length,
        },

        profile: {
            id:
                normalized
                    .profile
                    .id,

            label:
                normalized
                    .profile
                    .label,

            sourceType:
                normalized
                    .profile
                    .sourceType,

            standardReference:
                normalized
                    .profile
                    .standardReference,

            validatedStandardProfile:
                normalized
                    .profile
                    .validatedStandardProfile,
        },

        semantics:
            buildSemantics(
                normalized.profile
            ),
    };
}


/*
|--------------------------------------------------------------------------
| Semantics
|--------------------------------------------------------------------------
*/

function buildSemantics(
    profile
) {
    const validatedStandardProfile =
        profile
            ?.validatedStandardProfile ===
        true;


    const standardReference =
        profile
            ?.standardReference ??
        null;


    return {
        thresholdProfileRequired:
            true,

        defaultVoltageThresholdAssumed:
            false,

        defaultFrequencyThresholdAssumed:
            false,

        defaultVoltageUnbalanceThresholdAssumed:
            false,

        defaultCurrentUnbalanceThresholdAssumed:
            false,

        configuredThresholdClassification:
            Boolean(
                profile
            ),

        lowerLimitInclusive:
            true,

        upperLimitInclusive:
            true,

        exactlyAtLimitIsNormal:
            true,

        missingValueMeansNormal:
            false,

        missingValueMeansZero:
            false,

        operationalClassificationEqualsStandardsCompliance:
            false,

        standardReferencePresent:
            Boolean(
                standardReference
            ),

        validatedStandardProfile,

        standardsComplianceEstablished:
            false,

        standardsCertificationEstablished:
            false,

        outageEstablished:
            false,

        gridAvailabilityEstablished:
            false,

        serviceInterruptionEstablished:
            false,

        reliabilityStateModified:
            false,
    };
}


export default {
    GRID_QUALITY_CLASSIFICATION,
    GRID_QUALITY_THRESHOLD_STATUS,
    GRID_QUALITY_THRESHOLD_REASON,
    GRID_QUALITY_THRESHOLD_METRIC,
    GRID_QUALITY_THRESHOLD_TYPE,

    validateGridQualityThresholdProfile,
    normalizeGridQualityThresholdProfile,
    classifyRangeMetric,
    classifyMaximumMetric,
    classifyGridQualityMetric,
    classifyGridQualityMetrics,
};