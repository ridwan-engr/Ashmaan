// services/engineering/generatorContributionSemantics.js

/*
|--------------------------------------------------------------------------
| Phase 8.5F-C
| Generator Contribution-Ratio Semantic Qualification
|--------------------------------------------------------------------------
|
| Metric:
|
| generator contribution ratio
|
|       qualified generator electrical energy
|   ------------------------------------------------ × 100
|       qualified served-load electrical energy
|
| The numerator and denominator must describe compatible temporal coverage.
|
| This is NOT:
|
| - generator runtime percentage
| - generator availability
| - generator utilization
| - generator loading percentage
| - fuel contribution
| - percentage of rated generator capacity
|--------------------------------------------------------------------------
*/


export const GENERATOR_CONTRIBUTION_STATUS =
    Object.freeze({

        CALCULATED:
            "CALCULATED",

        PARTIALLY_CALCULATED:
            "PARTIALLY_CALCULATED",

        UNAVAILABLE:
            "UNAVAILABLE",
    });


export const GENERATOR_CONTRIBUTION_DENOMINATOR =
    Object.freeze({

        SERVED_LOAD_ENERGY:
            "SERVED_LOAD_ENERGY",

        REQUIRED_DEMAND_ENERGY:
            "REQUIRED_DEMAND_ENERGY",

        TOTAL_SITE_ENERGY:
            "TOTAL_SITE_ENERGY",

        UNRESOLVED:
            "UNRESOLVED",
    });


export const GENERATOR_CONTRIBUTION_SEMANTICS =
    Object.freeze({

        numerator:
            "GENERATOR_ELECTRICAL_ENERGY",

        qualifiedDenominator:
            GENERATOR_CONTRIBUTION_DENOMINATOR
                .SERVED_LOAD_ENERGY,

        outputUnit:
            "PERCENT",

        formula:
            "GENERATOR_ENERGY / SERVED_LOAD_ENERGY * 100",

        numeratorMustBeQualified:
            true,

        denominatorMustBeQualified:
            true,

        reportingWindowsMustMatch:
            true,

        temporalCoverageMustBeCompatible:
            true,

        denominatorMustBePositive:
            true,

        zeroDenominatorProducesZeroPercent:
            false,

        missingDenominatorProducesZeroPercent:
            false,

        partialCoverageAutomaticallyPromotedToFull:
            false,

        contributionMayExceed100Automatically:
            false,

        contributionClampedTo100:
            false,
    });


export const GENERATOR_CONTRIBUTION_BOUNDARIES =
    Object.freeze({

        GENERATOR_ENERGY_IS_VALID_NUMERATOR:
            true,

        SERVED_LOAD_ENERGY_IS_QUALIFIED_DENOMINATOR:
            true,

        REQUIRED_DEMAND_IS_ESTABLISHED:
            false,

        REQUIRED_DEMAND_CAN_BE_USED_AS_DENOMINATOR:
            false,

        GENERIC_SITE_KWH_CAN_BE_USED_AS_DENOMINATOR:
            false,

        GENERATOR_RUNTIME_CAN_BE_USED_AS_NUMERATOR:
            false,

        GENERATOR_LOADING_CAN_BE_USED_AS_NUMERATOR:
            false,

        GENERATOR_AVAILABILITY_CAN_BE_USED_AS_NUMERATOR:
            false,

        MISMATCHED_WINDOWS_CAN_BE_DIVIDED:
            false,

        MISMATCHED_COVERAGE_CAN_BE_DIVIDED:
            false,

        ZERO_SERVED_LOAD_ENERGY_MEANS_ZERO_CONTRIBUTION:
            false,

        MISSING_SERVED_LOAD_ENERGY_MEANS_ZERO:
            false,

        RATIO_IS_GENERATOR_UTILIZATION:
            false,

        RATIO_IS_GENERATOR_AVAILABILITY:
            false,

        RATIO_IS_GENERATOR_RUNTIME_PERCENT:
            false,

        RATIO_IS_FUEL_SHARE:
            false,

        RESULT_IS_AUTOMATICALLY_CLAMPED_TO_100:
            false,
    });


export function isQualifiedGeneratorContributionDenominator(
    denominator
) {

    return (
        denominator ===
        GENERATOR_CONTRIBUTION_DENOMINATOR
            .SERVED_LOAD_ENERGY
    );
}


export function canCalculateGeneratorContribution({
    generatorEnergyStatus,
    servedLoadEnergyStatus,
    generatorWindowStart,
    generatorWindowEnd,
    servedLoadWindowStart,
    servedLoadWindowEnd,
    generatorCoverageHours,
    servedLoadCoverageHours,
    toleranceHours = 1e-9,
} = {}) {

    const generatorQualified =
        generatorEnergyStatus ===
            GENERATOR_CONTRIBUTION_STATUS.CALCULATED ||
        generatorEnergyStatus ===
            GENERATOR_CONTRIBUTION_STATUS.PARTIALLY_CALCULATED;


    const servedLoadQualified =
        servedLoadEnergyStatus ===
            GENERATOR_CONTRIBUTION_STATUS.CALCULATED ||
        servedLoadEnergyStatus ===
            GENERATOR_CONTRIBUTION_STATUS.PARTIALLY_CALCULATED;


    if (
        !generatorQualified ||
        !servedLoadQualified
    ) {

        return false;
    }


    const generatorStart =
        new Date(
            generatorWindowStart
        );


    const generatorEnd =
        new Date(
            generatorWindowEnd
        );


    const servedStart =
        new Date(
            servedLoadWindowStart
        );


    const servedEnd =
        new Date(
            servedLoadWindowEnd
        );


    if (
        Number.isNaN(
            generatorStart.getTime()
        ) ||
        Number.isNaN(
            generatorEnd.getTime()
        ) ||
        Number.isNaN(
            servedStart.getTime()
        ) ||
        Number.isNaN(
            servedEnd.getTime()
        )
    ) {

        return false;
    }


    if (
        generatorStart.getTime() !==
            servedStart.getTime() ||
        generatorEnd.getTime() !==
            servedEnd.getTime()
    ) {

        return false;
    }


    const generatorCoverage =
        Number(
            generatorCoverageHours
        );


    const servedCoverage =
        Number(
            servedLoadCoverageHours
        );


    if (
        !Number.isFinite(
            generatorCoverage
        ) ||
        !Number.isFinite(
            servedCoverage
        )
    ) {

        return false;
    }


    if (
        generatorCoverage < 0 ||
        servedCoverage < 0
    ) {

        return false;
    }


    return (
        Math.abs(
            generatorCoverage -
            servedCoverage
        ) <=
        toleranceHours
    );
}


export default {

    GENERATOR_CONTRIBUTION_STATUS,

    GENERATOR_CONTRIBUTION_DENOMINATOR,

    GENERATOR_CONTRIBUTION_SEMANTICS,

    GENERATOR_CONTRIBUTION_BOUNDARIES,

    isQualifiedGeneratorContributionDenominator,

    canCalculateGeneratorContribution,
};