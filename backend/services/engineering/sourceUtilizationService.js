// services/engineering/sourceUtilizationService.js


/*
|--------------------------------------------------------------------------
| Phase 8.3F
| Source Utilization / Renewable Penetration Qualification
|--------------------------------------------------------------------------
|
| This service does NOT infer missing sources.
|
| It consumes already-qualified Phase 8.3C energy-source analytics and
| calculates contribution percentages only when the required engineering
| semantics have explicitly been established.
|
| Primary supply denominator:
|
|     Grid + Generator + Solar
|
| Battery is deliberately excluded because:
|
| - battery is storage, not a primary energy source
| - battery charge/discharge direction is not yet established
| - battery energy provenance is not established
|
|--------------------------------------------------------------------------
*/


/*
|--------------------------------------------------------------------------
| Status
|--------------------------------------------------------------------------
*/

export const SOURCE_UTILIZATION_STATUS =
    Object.freeze({

        CALCULATED:
            "CALCULATED",

        PARTIALLY_CALCULATED:
            "PARTIALLY_CALCULATED",

        UNAVAILABLE:
            "UNAVAILABLE",
    });


/*
|--------------------------------------------------------------------------
| Reasons
|--------------------------------------------------------------------------
*/

export const SOURCE_UTILIZATION_REASON =
    Object.freeze({

        QUALIFIED:
            "QUALIFIED",

        PARTIAL_SOURCE_COVERAGE:
            "PARTIAL_SOURCE_COVERAGE",

        SOURCE_ANALYTICS_UNAVAILABLE:
            "SOURCE_ANALYTICS_UNAVAILABLE",

        REPORTING_WINDOW_UNAVAILABLE:
            "REPORTING_WINDOW_UNAVAILABLE",

        TEMPORAL_ALIGNMENT_NOT_ESTABLISHED:
            "TEMPORAL_ALIGNMENT_NOT_ESTABLISHED",

        GRID_IMPORT_DIRECTION_NOT_ESTABLISHED:
            "GRID_IMPORT_DIRECTION_NOT_ESTABLISHED",

        GENERATOR_SUPPLY_DIRECTION_NOT_ESTABLISHED:
            "GENERATOR_SUPPLY_DIRECTION_NOT_ESTABLISHED",

        SOLAR_GENERATION_DIRECTION_NOT_ESTABLISHED:
            "SOLAR_GENERATION_DIRECTION_NOT_ESTABLISHED",

        REQUIRED_SOURCE_UNAVAILABLE:
            "REQUIRED_SOURCE_UNAVAILABLE",

        SOURCE_ENERGY_UNAVAILABLE:
            "SOURCE_ENERGY_UNAVAILABLE",

        INVALID_SOURCE_ENERGY:
            "INVALID_SOURCE_ENERGY",

        NEGATIVE_SOURCE_ENERGY:
            "NEGATIVE_SOURCE_ENERGY",

        TOTAL_PRIMARY_SUPPLY_NOT_POSITIVE:
            "TOTAL_PRIMARY_SUPPLY_NOT_POSITIVE",
    });


/*
|--------------------------------------------------------------------------
| Required primary sources
|--------------------------------------------------------------------------
*/

export const PRIMARY_SUPPLY_SOURCES =
    Object.freeze([
        "grid",
        "generator",
        "solar",
    ]);


/*
|--------------------------------------------------------------------------
| Default qualification
|--------------------------------------------------------------------------
|
| IMPORTANT:
|
| Grid direction is intentionally false by default.
|
| A signed grid-power integral is not automatically import energy.
|
| Temporal alignment is also false by default. Merely having three
| independent 24-hour source integrations does not prove that their
| qualified intervals overlap sufficiently.
|
|--------------------------------------------------------------------------
*/

export const DEFAULT_SOURCE_UTILIZATION_QUALIFICATION =
    Object.freeze({

        temporalAlignmentEstablished:
            false,

        gridImportDirectionEstablished:
            false,

        generatorSupplyDirectionEstablished:
            true,

        solarGenerationDirectionEstablished:
            true,
    });


/*
|--------------------------------------------------------------------------
| Boundaries
|--------------------------------------------------------------------------
*/

export const SOURCE_UTILIZATION_BOUNDARIES =
    Object.freeze({

        BATTERY_INCLUDED_IN_PRIMARY_SUPPLY:
            false,

        BATTERY_COUNTED_AS_RENEWABLE:
            false,

        MISSING_SOURCE_ASSUMED_ZERO:
            false,

        SIGNED_GRID_ENERGY_ASSUMED_IMPORT:
            false,

        UNALIGNED_SOURCE_WINDOWS_COMBINED:
            false,

        RENEWABLE_SOURCE_IN_PHASE_8_3F:
            "SOLAR_ONLY",
    });


/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

function finite(
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


function round(
    value,
    decimals = 6
) {

    if (
        !finite(
            value
        )
    ) {

        return null;
    }


    const factor =
        10 **
        decimals;


    return (
        Math.round(
            (
                value +
                Number.EPSILON
            ) *
            factor
        ) /
        factor
    );
}


function asDate(
    value
) {

    if (!value) {

        return null;
    }


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


function extractReportingWindow(
    sourceAnalytics
) {

    const start =
        asDate(
            sourceAnalytics
                ?.reportingWindow
                ?.start
        );


    const end =
        asDate(
            sourceAnalytics
                ?.reportingWindow
                ?.end
        );


    if (
        !start ||
        !end ||
        end <=
        start
    ) {

        return null;
    }


    return {

        start,

        end,

        semantics:
            sourceAnalytics
                ?.reportingWindow
                ?.semantics ??
            "[start,end)",
    };
}


function getSource(
    sourceAnalytics,
    sourceName
) {

    return (
        sourceAnalytics
            ?.sources
            ?.[
                sourceName
            ] ??
        null
    );
}


function getSourceEnergy(
    sourceResult
) {

    const value =
        sourceResult
            ?.metrics
            ?.energyKwh;


    return finite(
        value
    )
        ? value
        : null;
}


function sourceAvailable(
    sourceResult
) {

    return (
        sourceResult
            ?.status ===
            SOURCE_UTILIZATION_STATUS
                .CALCULATED ||
        sourceResult
            ?.status ===
            SOURCE_UTILIZATION_STATUS
                .PARTIALLY_CALCULATED
    );
}


function buildUnavailableMetric({
    key,
    label,
    unit,
    reason,
    metadata = {},
} = {}) {

    return {

        key,

        label,

        status:
            SOURCE_UTILIZATION_STATUS
                .UNAVAILABLE,

        reason,

        value:
            null,

        unit,

        metadata,
    };
}


function buildAvailableMetric({
    key,
    label,
    value,
    unit,
    status,
    reason,
    metadata = {},
} = {}) {

    return {

        key,

        label,

        status,

        reason,

        value:
            round(
                value
            ),

        unit,

        metadata,
    };
}


function buildUnavailableResult({
    reason,
    sourceAnalytics,
    qualification,
    evidence = {},
} = {}) {

    const reportingWindow =
        extractReportingWindow(
            sourceAnalytics
        );


    const metrics = [

        buildUnavailableMetric({
            key:
                "gridUtilizationPercent",

            label:
                "Grid Source Utilization",

            unit:
                "%",

            reason,
        }),

        buildUnavailableMetric({
            key:
                "generatorUtilizationPercent",

            label:
                "Generator Source Utilization",

            unit:
                "%",

            reason,
        }),

        buildUnavailableMetric({
            key:
                "solarUtilizationPercent",

            label:
                "Solar Source Utilization",

            unit:
                "%",

            reason,
        }),

        buildUnavailableMetric({
            key:
                "renewablePenetrationPercent",

            label:
                "Renewable Penetration",

            unit:
                "%",

            reason,
        }),

        buildUnavailableMetric({
            key:
                "qualifiedPrimarySupplyEnergyKwh",

            label:
                "Qualified Primary Supply Energy",

            unit:
                "kWh",

            reason,
        }),
    ];


    return {

        family:
            "SOURCE_UTILIZATION",

        status:
            SOURCE_UTILIZATION_STATUS
                .UNAVAILABLE,

        reason,

        reportingWindow,

        qualification,

        metrics,

        evidence,

        boundaries:
            SOURCE_UTILIZATION_BOUNDARIES,
    };
}


/*
|--------------------------------------------------------------------------
| Public calculation
|--------------------------------------------------------------------------
*/

export function calculateSourceUtilization({
    sourceAnalytics,
    qualification = {},
} = {}) {

    const resolvedQualification = {

        ...DEFAULT_SOURCE_UTILIZATION_QUALIFICATION,

        ...qualification,
    };


    /*
    |--------------------------------------------------------------------------
    | Source analytics
    |--------------------------------------------------------------------------
    */

    if (
        !sourceAnalytics ||
        !sourceAnalytics
            .sources
    ) {

        return buildUnavailableResult({

            reason:
                SOURCE_UTILIZATION_REASON
                    .SOURCE_ANALYTICS_UNAVAILABLE,

            sourceAnalytics,

            qualification:
                resolvedQualification,
        });
    }


    /*
    |--------------------------------------------------------------------------
    | Reporting window
    |--------------------------------------------------------------------------
    */

    const reportingWindow =
        extractReportingWindow(
            sourceAnalytics
        );


    if (!reportingWindow) {

        return buildUnavailableResult({

            reason:
                SOURCE_UTILIZATION_REASON
                    .REPORTING_WINDOW_UNAVAILABLE,

            sourceAnalytics,

            qualification:
                resolvedQualification,
        });
    }


    /*
    |--------------------------------------------------------------------------
    | Temporal alignment
    |--------------------------------------------------------------------------
    |
    | Three source totals covering the same nominal reporting window are not
    | sufficient evidence that their qualified integration intervals align.
    |
    |--------------------------------------------------------------------------
    */

    if (
        resolvedQualification
            .temporalAlignmentEstablished !==
        true
    ) {

        return buildUnavailableResult({

            reason:
                SOURCE_UTILIZATION_REASON
                    .TEMPORAL_ALIGNMENT_NOT_ESTABLISHED,

            sourceAnalytics,

            qualification:
                resolvedQualification,

            evidence: {
                reportingWindow,
            },
        });
    }


    /*
    |--------------------------------------------------------------------------
    | Direction semantics
    |--------------------------------------------------------------------------
    */

    if (
        resolvedQualification
            .gridImportDirectionEstablished !==
        true
    ) {

        return buildUnavailableResult({

            reason:
                SOURCE_UTILIZATION_REASON
                    .GRID_IMPORT_DIRECTION_NOT_ESTABLISHED,

            sourceAnalytics,

            qualification:
                resolvedQualification,
        });
    }


    if (
        resolvedQualification
            .generatorSupplyDirectionEstablished !==
        true
    ) {

        return buildUnavailableResult({

            reason:
                SOURCE_UTILIZATION_REASON
                    .GENERATOR_SUPPLY_DIRECTION_NOT_ESTABLISHED,

            sourceAnalytics,

            qualification:
                resolvedQualification,
        });
    }


    if (
        resolvedQualification
            .solarGenerationDirectionEstablished !==
        true
    ) {

        return buildUnavailableResult({

            reason:
                SOURCE_UTILIZATION_REASON
                    .SOLAR_GENERATION_DIRECTION_NOT_ESTABLISHED,

            sourceAnalytics,

            qualification:
                resolvedQualification,
        });
    }


    /*
    |--------------------------------------------------------------------------
    | Required source availability
    |--------------------------------------------------------------------------
    */

    const grid =
        getSource(
            sourceAnalytics,
            "grid"
        );


    const generator =
        getSource(
            sourceAnalytics,
            "generator"
        );


    const solar =
        getSource(
            sourceAnalytics,
            "solar"
        );


    const sourceResults = {
        grid,
        generator,
        solar,
    };


    for (
        const sourceName
        of PRIMARY_SUPPLY_SOURCES
    ) {

        const result =
            sourceResults[
                sourceName
            ];


        if (
            !sourceAvailable(
                result
            )
        ) {

            return buildUnavailableResult({

                reason:
                    SOURCE_UTILIZATION_REASON
                        .REQUIRED_SOURCE_UNAVAILABLE,

                sourceAnalytics,

                qualification:
                    resolvedQualification,

                evidence: {

                    unavailableSource:
                        sourceName,

                    sourceStatus:
                        result
                            ?.status ??
                        "UNAVAILABLE",

                    sourceReason:
                        result
                            ?.reason ??
                        null,
                },
            });
        }
    }


    /*
    |--------------------------------------------------------------------------
    | Extract source energy
    |--------------------------------------------------------------------------
    */

    const energies = {

        grid:
            getSourceEnergy(
                grid
            ),

        generator:
            getSourceEnergy(
                generator
            ),

        solar:
            getSourceEnergy(
                solar
            ),
    };


    for (
        const sourceName
        of PRIMARY_SUPPLY_SOURCES
    ) {

        const value =
            energies[
                sourceName
            ];


        if (
            value ===
            null
        ) {

            return buildUnavailableResult({

                reason:
                    SOURCE_UTILIZATION_REASON
                        .SOURCE_ENERGY_UNAVAILABLE,

                sourceAnalytics,

                qualification:
                    resolvedQualification,

                evidence: {

                    invalidSource:
                        sourceName,
                },
            });
        }


        if (
            !finite(
                value
            )
        ) {

            return buildUnavailableResult({

                reason:
                    SOURCE_UTILIZATION_REASON
                        .INVALID_SOURCE_ENERGY,

                sourceAnalytics,

                qualification:
                    resolvedQualification,

                evidence: {

                    invalidSource:
                        sourceName,

                    value,
                },
            });
        }


        /*
         * Once these quantities are declared supply contribution energy,
         * negative values are not acceptable.
         *
         * For Grid in particular this protects against treating a signed
         * net/export integral as import energy.
         */

        if (
            value <
            0
        ) {

            return buildUnavailableResult({

                reason:
                    SOURCE_UTILIZATION_REASON
                        .NEGATIVE_SOURCE_ENERGY,

                sourceAnalytics,

                qualification:
                    resolvedQualification,

                evidence: {

                    invalidSource:
                        sourceName,

                    value,
                },
            });
        }
    }


    /*
    |--------------------------------------------------------------------------
    | Primary supply denominator
    |--------------------------------------------------------------------------
    |
    | Battery is NOT included here.
    |
    |--------------------------------------------------------------------------
    */

    const totalPrimarySupplyEnergyKwh =
        energies.grid +
        energies.generator +
        energies.solar;


    if (
        !finite(
            totalPrimarySupplyEnergyKwh
        ) ||
        totalPrimarySupplyEnergyKwh <=
        0
    ) {

        return buildUnavailableResult({

            reason:
                SOURCE_UTILIZATION_REASON
                    .TOTAL_PRIMARY_SUPPLY_NOT_POSITIVE,

            sourceAnalytics,

            qualification:
                resolvedQualification,

            evidence: {
                energies,
            },
        });
    }


    /*
    |--------------------------------------------------------------------------
    | Determine family status
    |--------------------------------------------------------------------------
    */

    const hasPartialSource =
        PRIMARY_SUPPLY_SOURCES.some(
            (
                sourceName
            ) =>
                sourceResults[
                    sourceName
                ]
                    ?.status ===
                SOURCE_UTILIZATION_STATUS
                    .PARTIALLY_CALCULATED
        );


    const status =
        hasPartialSource
            ? SOURCE_UTILIZATION_STATUS
                .PARTIALLY_CALCULATED
            : SOURCE_UTILIZATION_STATUS
                .CALCULATED;


    const reason =
        hasPartialSource
            ? SOURCE_UTILIZATION_REASON
                .PARTIAL_SOURCE_COVERAGE
            : SOURCE_UTILIZATION_REASON
                .QUALIFIED;


    /*
    |--------------------------------------------------------------------------
    | Ratios
    |--------------------------------------------------------------------------
    */

    const gridPercent =
        (
            energies.grid /
            totalPrimarySupplyEnergyKwh
        ) *
        100;


    const generatorPercent =
        (
            energies.generator /
            totalPrimarySupplyEnergyKwh
        ) *
        100;


    const solarPercent =
        (
            energies.solar /
            totalPrimarySupplyEnergyKwh
        ) *
        100;


    /*
     * Solar is the only explicitly qualified renewable primary source in
     * Phase 8.3F.
     *
     * Battery discharge is not counted as renewable generation.
     */

    const renewablePenetrationPercent =
        solarPercent;


    const commonMetadata = {

        denominator:
            "GRID_IMPORT + GENERATOR_SUPPLY + SOLAR_GENERATION",

        batteryExcluded:
            true,

        temporallyAligned:
            true,
    };


    const metrics = [

        buildAvailableMetric({

            key:
                "gridUtilizationPercent",

            label:
                "Grid Source Utilization",

            value:
                gridPercent,

            unit:
                "%",

            status,

            reason,

            metadata: {

                ...commonMetadata,

                numeratorEnergyKwh:
                    energies.grid,
            },
        }),

        buildAvailableMetric({

            key:
                "generatorUtilizationPercent",

            label:
                "Generator Source Utilization",

            value:
                generatorPercent,

            unit:
                "%",

            status,

            reason,

            metadata: {

                ...commonMetadata,

                numeratorEnergyKwh:
                    energies.generator,
            },
        }),

        buildAvailableMetric({

            key:
                "solarUtilizationPercent",

            label:
                "Solar Source Utilization",

            value:
                solarPercent,

            unit:
                "%",

            status,

            reason,

            metadata: {

                ...commonMetadata,

                numeratorEnergyKwh:
                    energies.solar,
            },
        }),

        buildAvailableMetric({

            key:
                "renewablePenetrationPercent",

            label:
                "Renewable Penetration",

            value:
                renewablePenetrationPercent,

            unit:
                "%",

            status,

            reason,

            metadata: {

                ...commonMetadata,

                renewableNumerator:
                    "SOLAR_GENERATION_ONLY",

                batteryRenewableContribution:
                    false,
            },
        }),

        buildAvailableMetric({

            key:
                "qualifiedPrimarySupplyEnergyKwh",

            label:
                "Qualified Primary Supply Energy",

            value:
                totalPrimarySupplyEnergyKwh,

            unit:
                "kWh",

            status,

            reason,

            metadata: {
                batteryExcluded:
                    true,
            },
        }),
    ];


    return {

        family:
            "SOURCE_UTILIZATION",

        status,

        reason,

        reportingWindow,

        qualification:
            resolvedQualification,

        metrics,

        evidence: {

            sourceEnergyKwh: {

                grid:
                    energies.grid,

                generator:
                    energies.generator,

                solar:
                    energies.solar,
            },

            totalPrimarySupplyEnergyKwh:
                round(
                    totalPrimarySupplyEnergyKwh
                ),

            sourceStatuses: {

                grid:
                    grid.status,

                generator:
                    generator.status,

                solar:
                    solar.status,
            },
        },

        boundaries:
            SOURCE_UTILIZATION_BOUNDARIES,
    };
}


/*
|--------------------------------------------------------------------------
| Metric lookup helper
|--------------------------------------------------------------------------
*/

export function getSourceUtilizationMetric(
    result,
    key
) {

    return (
        result
            ?.metrics
            ?.find(
                (
                    metric
                ) =>
                    metric.key ===
                    key
            ) ??
        null
    );
}