// services/financialBi/financialBiCalculationExecutionService.js

import {
    FINANCIAL_BI_INPUT_STATUS,
}
    from "./financialBiContract.js";

import {
    FINANCIAL_BI_INPUT_QUALIFICATION_PHASE,
}
    from "./financialBiInputQualificationService.js";

import {
    FINANCIAL_BI_CALCULATION_CONTRACT_PHASE,
    FINANCIAL_BI_CALCULATION_FORMULA_KIND,
    FINANCIAL_BI_COMPLETENESS_POLICY,
}
    from "./financialBiCalculationContract.js";


export const FINANCIAL_BI_CALCULATION_EXECUTION_PHASE =
    "10.4";

export const FINANCIAL_BI_CALCULATION_EXECUTION_LAYER =
    "FINANCIAL_BI";

export const FINANCIAL_BI_CALCULATION_EXECUTION_UPSTREAM_PHASE =
    FINANCIAL_BI_CALCULATION_CONTRACT_PHASE;


export const FINANCIAL_BI_CALCULATION_EXECUTION_STATUS =
    Object.freeze({
        CALCULATED:
            "CALCULATED",

        PARTIALLY_CALCULATED:
            "PARTIALLY_CALCULATED",

        UNAVAILABLE:
            "UNAVAILABLE"
    });


export const FINANCIAL_BI_CALCULATION_EXECUTION_REASON =
    Object.freeze({
        CALCULATION_COMPLETE:
            "CALCULATION_COMPLETE",

        PARTIAL_INPUTS_USED:
            "PARTIAL_INPUTS_USED",

        REQUIRED_INPUT_UNAVAILABLE:
            "REQUIRED_INPUT_UNAVAILABLE",

        NO_EXECUTABLE_INPUTS:
            "NO_EXECUTABLE_INPUTS",

        DIVISION_BY_ZERO:
            "DIVISION_BY_ZERO",

        UNSUPPORTED_FORMULA_KIND:
            "UNSUPPORTED_FORMULA_KIND",

        QUALIFICATION_PHASE_INVALID:
            "QUALIFICATION_PHASE_INVALID",

        INPUT_METRIC_MISMATCH:
            "INPUT_METRIC_MISMATCH"
    });


export const FINANCIAL_BI_CALCULATION_EXECUTION_BOUNDARIES =
    Object.freeze({
        inputQualificationRequired:
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

        tariffInferenceAllowed:
            false,

        taxInferenceAllowed:
            false,

        resamplingAllowed:
            false,

        interpolationAllowed:
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


function unavailable({
    definition,
    reason,
    diagnostics = null,
} = {}) {
    return Object.freeze({
        phase:
            FINANCIAL_BI_CALCULATION_EXECUTION_PHASE,

        layer:
            FINANCIAL_BI_CALCULATION_EXECUTION_LAYER,

        upstreamPhase:
            FINANCIAL_BI_CALCULATION_EXECUTION_UPSTREAM_PHASE,

        definition,

        status:
            FINANCIAL_BI_CALCULATION_EXECUTION_STATUS.UNAVAILABLE,

        reason,

        result:
            Object.freeze({
                value:
                    null,

                unit:
                    definition?.outputMetric?.unit ??
                    null,

                currency:
                    definition?.outputMetric?.currency ??
                    null,

                calculated:
                    false
            }),

        diagnostics,

        boundaries:
            FINANCIAL_BI_CALCULATION_EXECUTION_BOUNDARIES
    });
}


function summarizeQualification(
    qualification
) {
    if (
        !qualification ||
        qualification.phase !==
            FINANCIAL_BI_INPUT_QUALIFICATION_PHASE
    ) {
        return {
            valid:
                false,

            reason:
                FINANCIAL_BI_CALCULATION_EXECUTION_REASON.QUALIFICATION_PHASE_INVALID,

            values:
                []
        };
    }

    const values =
        qualification.qualifiedObservations
            .map(
                item =>
                    item?.observation?.value
            )
            .filter(
                value =>
                    typeof value ===
                        "number" &&
                    Number.isFinite(
                        value
                    )
            );

    return {
        valid:
            true,

        status:
            qualification.status,

        metricName:
            qualification.metricName,

        values
    };
}


function reduceQualificationValues(
    values
) {
    if (
        values.length ===
            0
    ) {
        return null;
    }

    return values.reduce(
        (
            sum,
            value
        ) =>
            sum +
            value,
        0
    );
}


function executeFormula({
    kind,
    values,
} = {}) {
    switch (
        kind
    ) {
        case FINANCIAL_BI_CALCULATION_FORMULA_KIND.SUM:
            return values.reduce(
                (
                    sum,
                    value
                ) =>
                    sum +
                    value,
                0
            );

        case FINANCIAL_BI_CALCULATION_FORMULA_KIND.DIFFERENCE:
            return values
                .slice(
                    1
                )
                .reduce(
                    (
                        result,
                        value
                    ) =>
                        result -
                        value,
                    values[0]
                );

        case FINANCIAL_BI_CALCULATION_FORMULA_KIND.PRODUCT:
            return values.reduce(
                (
                    result,
                    value
                ) =>
                    result *
                    value,
                1
            );

        case FINANCIAL_BI_CALCULATION_FORMULA_KIND.RATIO:
            if (
                values.length !==
                    2
            ) {
                return {
                    error:
                        FINANCIAL_BI_CALCULATION_EXECUTION_REASON.NO_EXECUTABLE_INPUTS
                };
            }

            if (
                values[1] ===
                    0
            ) {
                return {
                    error:
                        FINANCIAL_BI_CALCULATION_EXECUTION_REASON.DIVISION_BY_ZERO
                };
            }

            return values[0] /
                values[1];

        case FINANCIAL_BI_CALCULATION_FORMULA_KIND.PERCENTAGE:
            if (
                values.length !==
                    2
            ) {
                return {
                    error:
                        FINANCIAL_BI_CALCULATION_EXECUTION_REASON.NO_EXECUTABLE_INPUTS
                };
            }

            if (
                values[1] ===
                    0
            ) {
                return {
                    error:
                        FINANCIAL_BI_CALCULATION_EXECUTION_REASON.DIVISION_BY_ZERO
                };
            }

            return (
                values[0] /
                values[1]
            ) *
                100;

        case FINANCIAL_BI_CALCULATION_FORMULA_KIND.WEIGHTED_SUM:
            return {
                error:
                    FINANCIAL_BI_CALCULATION_EXECUTION_REASON.UNSUPPORTED_FORMULA_KIND
            };

        default:
            return {
                error:
                    FINANCIAL_BI_CALCULATION_EXECUTION_REASON.UNSUPPORTED_FORMULA_KIND
            };
    }
}


export function executeFinancialBiCalculation({
    definition,
} = {}) {
    if (
        !definition ||
        definition.phase !==
            FINANCIAL_BI_CALCULATION_CONTRACT_PHASE
    ) {
        throw new Error(
            "FINANCIAL_BI_CALCULATION_CONTRACT_REQUIRED"
        );
    }

    const executableValues =
        [];

    const inputDiagnostics =
        [];

    let partialInputUsed =
        false;

    for (
        const input of
        definition.inputs
    ) {
        const summary =
            summarizeQualification(
                input.qualification
            );

        if (
            !summary.valid
        ) {
            if (
                input.required
            ) {
                return unavailable({
                    definition,

                    reason:
                        summary.reason
                });
            }

            partialInputUsed =
                true;

            inputDiagnostics.push(
                Object.freeze({
                    name:
                        input.name,

                    metricName:
                        input.metricName,

                    used:
                        false,

                    reason:
                        summary.reason
                })
            );

            continue;
        }

        if (
            summary.metricName !==
                input.metricName
        ) {
            return unavailable({
                definition,

                reason:
                    FINANCIAL_BI_CALCULATION_EXECUTION_REASON.INPUT_METRIC_MISMATCH
            });
        }

        const reducedValue =
            reduceQualificationValues(
                summary.values
            );

        if (
            reducedValue ===
                null
        ) {
            if (
                input.required ||
                definition.completenessPolicy ===
                    FINANCIAL_BI_COMPLETENESS_POLICY.ALL_INPUTS_REQUIRED
            ) {
                return unavailable({
                    definition,

                    reason:
                        FINANCIAL_BI_CALCULATION_EXECUTION_REASON.REQUIRED_INPUT_UNAVAILABLE
                });
            }

            partialInputUsed =
                true;

            inputDiagnostics.push(
                Object.freeze({
                    name:
                        input.name,

                    metricName:
                        input.metricName,

                    used:
                        false,

                    reason:
                        FINANCIAL_BI_CALCULATION_EXECUTION_REASON.REQUIRED_INPUT_UNAVAILABLE
                })
            );

            continue;
        }

        if (
            summary.status !==
                FINANCIAL_BI_INPUT_STATUS.QUALIFIED
        ) {
            if (
                input.required &&
                definition.completenessPolicy ===
                    FINANCIAL_BI_COMPLETENESS_POLICY.ALL_INPUTS_REQUIRED
            ) {
                return unavailable({
                    definition,

                    reason:
                        FINANCIAL_BI_CALCULATION_EXECUTION_REASON.REQUIRED_INPUT_UNAVAILABLE
                });
            }

            partialInputUsed =
                true;
        }

        executableValues.push(
            reducedValue
        );

        inputDiagnostics.push(
            Object.freeze({
                name:
                    input.name,

                metricName:
                    input.metricName,

                used:
                    true,

                qualificationStatus:
                    summary.status,

                value:
                    reducedValue
            })
        );
    }

    if (
        executableValues.length ===
            0
    ) {
        return unavailable({
            definition,

            reason:
                FINANCIAL_BI_CALCULATION_EXECUTION_REASON.NO_EXECUTABLE_INPUTS,

            diagnostics:
                Object.freeze(
                    inputDiagnostics
                )
        });
    }

    const calculated =
        executeFormula({
            kind:
                definition.formula.kind,

            values:
                executableValues
        });

    if (
        calculated &&
        typeof calculated ===
            "object" &&
        calculated.error
    ) {
        return unavailable({
            definition,

            reason:
                calculated.error,

            diagnostics:
                Object.freeze(
                    inputDiagnostics
                )
        });
    }

    if (
        typeof calculated !==
            "number" ||
        !Number.isFinite(
            calculated
        )
    ) {
        return unavailable({
            definition,

            reason:
                FINANCIAL_BI_CALCULATION_EXECUTION_REASON.NO_EXECUTABLE_INPUTS,

            diagnostics:
                Object.freeze(
                    inputDiagnostics
                )
        });
    }

    const status =
        partialInputUsed
            ? FINANCIAL_BI_CALCULATION_EXECUTION_STATUS.PARTIALLY_CALCULATED
            : FINANCIAL_BI_CALCULATION_EXECUTION_STATUS.CALCULATED;

    const reason =
        partialInputUsed
            ? FINANCIAL_BI_CALCULATION_EXECUTION_REASON.PARTIAL_INPUTS_USED
            : FINANCIAL_BI_CALCULATION_EXECUTION_REASON.CALCULATION_COMPLETE;

    return Object.freeze({
        phase:
            FINANCIAL_BI_CALCULATION_EXECUTION_PHASE,

        layer:
            FINANCIAL_BI_CALCULATION_EXECUTION_LAYER,

        upstreamPhase:
            FINANCIAL_BI_CALCULATION_EXECUTION_UPSTREAM_PHASE,

        definition,

        status,

        reason,

        result:
            Object.freeze({
                value:
                    calculated,

                unit:
                    definition.outputMetric.unit,

                currency:
                    definition.outputMetric.currency,

                calculated:
                    true
            }),

        diagnostics:
            Object.freeze(
                inputDiagnostics
            ),

        boundaries:
            FINANCIAL_BI_CALCULATION_EXECUTION_BOUNDARIES
    });
}
