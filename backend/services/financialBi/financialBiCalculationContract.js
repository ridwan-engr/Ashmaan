// services/financialBi/financialBiCalculationContract.js

import {
    FINANCIAL_BI_PHASE,
    FINANCIAL_BI_LAYER,
    FINANCIAL_BI_METRIC_KIND,
    FINANCIAL_BI_VALUE_KIND,
    FINANCIAL_BI_STATUS,
}
    from "./financialBiContract.js";

import {
    FINANCIAL_BI_INPUT_QUALIFICATION_PHASE,
}
    from "./financialBiInputQualificationService.js";


export const FINANCIAL_BI_CALCULATION_CONTRACT_PHASE =
    "10.3";

export const FINANCIAL_BI_CALCULATION_CONTRACT_LAYER =
    "FINANCIAL_BI";

export const FINANCIAL_BI_CALCULATION_CONTRACT_UPSTREAM_PHASE =
    FINANCIAL_BI_INPUT_QUALIFICATION_PHASE;


export const FINANCIAL_BI_CALCULATION_STATUS =
    Object.freeze({
        CONTRACT_DEFINED:
            "CONTRACT_DEFINED",

        NOT_EXECUTED:
            "NOT_EXECUTED",

        CALCULATED:
            "CALCULATED",

        PARTIALLY_CALCULATED:
            "PARTIALLY_CALCULATED",

        UNAVAILABLE:
            "UNAVAILABLE",
    });


export const FINANCIAL_BI_CALCULATION_FORMULA_KIND =
    Object.freeze({
        SUM:
            "SUM",

        DIFFERENCE:
            "DIFFERENCE",

        PRODUCT:
            "PRODUCT",

        RATIO:
            "RATIO",

        PERCENTAGE:
            "PERCENTAGE",

        WEIGHTED_SUM:
            "WEIGHTED_SUM"
    });


export const FINANCIAL_BI_COMPLETENESS_POLICY =
    Object.freeze({
        ALL_INPUTS_REQUIRED:
            "ALL_INPUTS_REQUIRED",

        PARTIAL_INPUTS_ALLOWED:
            "PARTIAL_INPUTS_ALLOWED"
    });


export const FINANCIAL_BI_CALCULATION_CONTRACT_BOUNDARIES =
    Object.freeze({
        calculationExecuted:
            false,

        inputQualificationRequired:
            true,

        tariffInferenceAllowed:
            false,

        taxInferenceAllowed:
            false,

        currencyInferenceAllowed:
            false,

        currencyConversionAllowed:
            false,

        unitInferenceAllowed:
            false,

        missingMeansZero:
            false,

        unavailableMeansZero:
            false,

        partialMeansComplete:
            false,

        forecastMutationIncluded:
            false,

        engineeringAnalyticsMutationIncluded:
            false,

        telemetryMutationIncluded:
            false,

        eventMutationIncluded:
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


function requireNonEmptyString(
    value,
    field
) {
    if (
        typeof value !==
            "string" ||
        !value.trim()
    ) {
        throw new Error(
            `${field}_REQUIRED`
        );
    }

    return value.trim();
}


function assertControlledValue({
    value,
    container,
    field,
} = {}) {
    if (
        !Object.values(
            container
        ).includes(
            value
        )
    ) {
        throw new Error(
            `${field}_INVALID`
        );
    }
}


function normalizeInputReference(
    input,
    index
) {
    if (
        !input ||
        typeof input !==
            "object"
    ) {
        throw new Error(
            `INPUT_${index}_INVALID`
        );
    }

    return Object.freeze({
        name:
            requireNonEmptyString(
                input.name,
                `INPUT_${index}_NAME`
            ),

        metricName:
            requireNonEmptyString(
                input.metricName,
                `INPUT_${index}_METRIC_NAME`
            ),

        qualification:
            input.qualification ??
                null,

        required:
            input.required !==
                false
    });
}


export function buildFinancialBiCalculationDefinition({
    name,
    formulaKind,
    outputMetric,
    inputs,
    completenessPolicy =
        FINANCIAL_BI_COMPLETENESS_POLICY.ALL_INPUTS_REQUIRED,
    description = null,
} = {}) {
    const normalizedName =
        requireNonEmptyString(
            name,
            "CALCULATION_NAME"
        );

    assertControlledValue({
        value:
            formulaKind,

        container:
            FINANCIAL_BI_CALCULATION_FORMULA_KIND,

        field:
            "FORMULA_KIND"
    });

    assertControlledValue({
        value:
            completenessPolicy,

        container:
            FINANCIAL_BI_COMPLETENESS_POLICY,

        field:
            "COMPLETENESS_POLICY"
    });

    if (
        !outputMetric ||
        outputMetric.status !==
            FINANCIAL_BI_STATUS.CONTRACT_DEFINED
    ) {
        throw new Error(
            "OUTPUT_METRIC_CONTRACT_REQUIRED"
        );
    }

    if (
        !Array.isArray(
            inputs
        ) ||
        inputs.length ===
            0
    ) {
        throw new Error(
            "CALCULATION_INPUTS_REQUIRED"
        );
    }

    const normalizedInputs =
        inputs.map(
            normalizeInputReference
        );

    const inputNames =
        new Set();

    for (
        const input of
        normalizedInputs
    ) {
        if (
            inputNames.has(
                input.name
            )
        ) {
            throw new Error(
                "DUPLICATE_CALCULATION_INPUT_NAME"
            );
        }

        inputNames.add(
            input.name
        );
    }

    return Object.freeze({
        phase:
            FINANCIAL_BI_CALCULATION_CONTRACT_PHASE,

        layer:
            FINANCIAL_BI_CALCULATION_CONTRACT_LAYER,

        upstreamPhase:
            FINANCIAL_BI_CALCULATION_CONTRACT_UPSTREAM_PHASE,

        name:
            normalizedName,

        formula:
            Object.freeze({
                kind:
                    formulaKind,

                executed:
                    false
            }),

        outputMetric,

        inputs:
            Object.freeze(
                normalizedInputs
            ),

        inputCount:
            normalizedInputs.length,

        completenessPolicy,

        description:
            description ===
                null ||
            description ===
                undefined
                ? null
                : requireNonEmptyString(
                    description,
                    "DESCRIPTION"
                ),

        status:
            FINANCIAL_BI_CALCULATION_STATUS.CONTRACT_DEFINED,

        result:
            Object.freeze({
                status:
                    FINANCIAL_BI_CALCULATION_STATUS.NOT_EXECUTED,

                value:
                    null,

                unit:
                    outputMetric.unit,

                currency:
                    outputMetric.currency,

                calculated:
                    false
            }),

        boundaries:
            FINANCIAL_BI_CALCULATION_CONTRACT_BOUNDARIES
    });
}
