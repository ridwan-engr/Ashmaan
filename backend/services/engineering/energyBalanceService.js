// services/engineering/energyBalanceService.js


/*
|--------------------------------------------------------------------------
| Phase 8.3G-A
| Energy Balance Qualification Service
|--------------------------------------------------------------------------
|
| Qualified engineering balance:
|
|     Primary supply
|   + Battery discharge
|   - Battery charge
|   - Served load
|   = Residual
|
| Where:
|
| Primary supply =
|     Grid import
|   + Generator supply
|   + Solar generation
|
| No missing component is interpreted as zero.
|
|--------------------------------------------------------------------------
*/


/*
|--------------------------------------------------------------------------
| Status
|--------------------------------------------------------------------------
*/

export const ENERGY_BALANCE_STATUS =
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

export const ENERGY_BALANCE_REASON =
    Object.freeze({

        QUALIFIED:
            "QUALIFIED",

        PARTIAL_INPUT_COVERAGE:
            "PARTIAL_INPUT_COVERAGE",

        INVALID_REPORTING_WINDOW:
            "INVALID_REPORTING_WINDOW",

        SOURCE_ANALYTICS_UNAVAILABLE:
            "SOURCE_ANALYTICS_UNAVAILABLE",

        LOAD_ANALYTICS_UNAVAILABLE:
            "LOAD_ANALYTICS_UNAVAILABLE",

        GRID_IMPORT_DIRECTION_NOT_ESTABLISHED:
            "GRID_IMPORT_DIRECTION_NOT_ESTABLISHED",

        GENERATOR_SUPPLY_DIRECTION_NOT_ESTABLISHED:
            "GENERATOR_SUPPLY_DIRECTION_NOT_ESTABLISHED",

        SOLAR_GENERATION_DIRECTION_NOT_ESTABLISHED:
            "SOLAR_GENERATION_DIRECTION_NOT_ESTABLISHED",

        BATTERY_DIRECTION_NOT_ESTABLISHED:
            "BATTERY_DIRECTION_NOT_ESTABLISHED",

        TEMPORAL_ALIGNMENT_NOT_ESTABLISHED:
            "TEMPORAL_ALIGNMENT_NOT_ESTABLISHED",

        GRID_ENERGY_UNAVAILABLE:
            "GRID_ENERGY_UNAVAILABLE",

        GENERATOR_ENERGY_UNAVAILABLE:
            "GENERATOR_ENERGY_UNAVAILABLE",

        SOLAR_ENERGY_UNAVAILABLE:
            "SOLAR_ENERGY_UNAVAILABLE",

        BATTERY_CHARGE_ENERGY_UNAVAILABLE:
            "BATTERY_CHARGE_ENERGY_UNAVAILABLE",

        BATTERY_DISCHARGE_ENERGY_UNAVAILABLE:
            "BATTERY_DISCHARGE_ENERGY_UNAVAILABLE",

        SERVED_LOAD_ENERGY_UNAVAILABLE:
            "SERVED_LOAD_ENERGY_UNAVAILABLE",

        INVALID_ENERGY_VALUE:
            "INVALID_ENERGY_VALUE",

        NEGATIVE_SUPPLY_ENERGY:
            "NEGATIVE_SUPPLY_ENERGY",

        NEGATIVE_BATTERY_DIRECTIONAL_ENERGY:
            "NEGATIVE_BATTERY_DIRECTIONAL_ENERGY",

        NEGATIVE_SERVED_LOAD_ENERGY:
            "NEGATIVE_SERVED_LOAD_ENERGY",

        TOTAL_INPUT_ENERGY_NOT_POSITIVE:
            "TOTAL_INPUT_ENERGY_NOT_POSITIVE",
    });


/*
|--------------------------------------------------------------------------
| Default qualification
|--------------------------------------------------------------------------
|
| Battery direction remains unresolved in current production.
|
|--------------------------------------------------------------------------
*/

export const DEFAULT_ENERGY_BALANCE_QUALIFICATION =
    Object.freeze({

        temporalAlignmentEstablished:
            false,

        gridImportDirectionEstablished:
            false,

        generatorSupplyDirectionEstablished:
            true,

        solarGenerationDirectionEstablished:
            true,

        batteryDirectionEstablished:
            false,
    });


/*
|--------------------------------------------------------------------------
| Engineering boundaries
|--------------------------------------------------------------------------
*/

export const ENERGY_BALANCE_BOUNDARIES =
    Object.freeze({

        MISSING_ENERGY_ASSUMED_ZERO:
            false,

        SIGNED_GRID_ASSUMED_IMPORT:
            false,

        SIGNED_BATTERY_POWER_SPLIT_AUTOMATICALLY:
            false,

        BATTERY_DIRECTION_REQUIRED:
            true,

        SERVED_LOAD_TREATED_AS_REQUIRED_DEMAND:
            false,

        UNALIGNED_INTERVALS_RECONCILED:
            false,

        RESIDUAL_USED_TO_INFER_MISSING_SOURCE:
            false,
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


function normalizeReportingWindow(
    sourceAnalytics,
    loadAnalytics
) {

    const sourceStart =
        asDate(
            sourceAnalytics
                ?.reportingWindow
                ?.start
        );

    const sourceEnd =
        asDate(
            sourceAnalytics
                ?.reportingWindow
                ?.end
        );

    const loadStart =
        asDate(
            loadAnalytics
                ?.reportingWindow
                ?.start
        );

    const loadEnd =
        asDate(
            loadAnalytics
                ?.reportingWindow
                ?.end
        );


    if (
        !sourceStart ||
        !sourceEnd ||
        !loadStart ||
        !loadEnd ||
        sourceEnd <=
            sourceStart ||
        loadEnd <=
            loadStart
    ) {

        return null;
    }


    return {

        sourceStart,
        sourceEnd,
        loadStart,
        loadEnd,

        exactNominalMatch:
            (
                sourceStart.getTime() ===
                    loadStart.getTime() &&
                sourceEnd.getTime() ===
                    loadEnd.getTime()
            ),

        semantics:
            "[start,end)",
    };
}


function sourceStatusAvailable(
    source
) {

    return (
        source?.status ===
            ENERGY_BALANCE_STATUS
                .CALCULATED ||
        source?.status ===
            ENERGY_BALANCE_STATUS
                .PARTIALLY_CALCULATED
    );
}


function loadStatusAvailable(
    loadAnalytics
) {

    return (
        loadAnalytics?.status ===
            ENERGY_BALANCE_STATUS
                .CALCULATED ||
        loadAnalytics?.status ===
            ENERGY_BALANCE_STATUS
                .PARTIALLY_CALCULATED
    );
}


function getSourceEnergy(
    sourceAnalytics,
    key
) {

    const value =
        sourceAnalytics
            ?.sources
            ?.[key]
            ?.metrics
            ?.energyKwh;


    return finite(
        value
    )
        ? value
        : null;
}


function getServedLoadEnergy(
    loadAnalytics
) {

    /*
     * Phase 8.2 stores metrics as an array.
     */

    const metric =
        loadAnalytics
            ?.metrics
            ?.find(
                (
                    item
                ) =>
                    item.key ===
                    "observedLoadEnergyKwh"
            );


    return finite(
        metric?.value
    )
        ? metric.value
        : null;
}


function buildUnavailableMetric({
    key,
    label,
    unit,
    reason,
} = {}) {

    return {

        key,

        label,

        status:
            ENERGY_BALANCE_STATUS
                .UNAVAILABLE,

        reason,

        value:
            null,

        unit,
    };
}


function buildAvailableMetric({
    key,
    label,
    unit,
    value,
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


function unavailableResult({
    reason,
    sourceAnalytics,
    loadAnalytics,
    qualification,
    evidence = {},
} = {}) {

    return {

        family:
            "ENERGY_BALANCE",

        status:
            ENERGY_BALANCE_STATUS
                .UNAVAILABLE,

        reason,

        reportingWindow:
            normalizeReportingWindow(
                sourceAnalytics,
                loadAnalytics
            ),

        qualification,

        metrics: [

            buildUnavailableMetric({
                key:
                    "qualifiedSupplyEnergyKwh",

                label:
                    "Qualified Supply Energy",

                unit:
                    "kWh",

                reason,
            }),

            buildUnavailableMetric({
                key:
                    "qualifiedServedLoadEnergyKwh",

                label:
                    "Qualified Served Load Energy",

                unit:
                    "kWh",

                reason,
            }),

            buildUnavailableMetric({
                key:
                    "energyBalanceResidualKwh",

                label:
                    "Energy Balance Residual",

                unit:
                    "kWh",

                reason,
            }),

            buildUnavailableMetric({
                key:
                    "energyBalanceErrorPercent",

                label:
                    "Energy Balance Error",

                unit:
                    "%",

                reason,
            }),
        ],

        evidence,

        boundaries:
            ENERGY_BALANCE_BOUNDARIES,
    };
}


/*
|--------------------------------------------------------------------------
| Public calculator
|--------------------------------------------------------------------------
*/

export function calculateEnergyBalance({
    sourceAnalytics,
    loadAnalytics,

    batteryDirectionalEnergy = {},

    qualification = {},
} = {}) {

    const resolvedQualification = {

        ...DEFAULT_ENERGY_BALANCE_QUALIFICATION,

        ...qualification,
    };


    /*
    |--------------------------------------------------------------------------
    | Required analytics
    |--------------------------------------------------------------------------
    */

    if (
        !sourceAnalytics ||
        !sourceAnalytics
            .sources
    ) {

        return unavailableResult({

            reason:
                ENERGY_BALANCE_REASON
                    .SOURCE_ANALYTICS_UNAVAILABLE,

            sourceAnalytics,

            loadAnalytics,

            qualification:
                resolvedQualification,
        });
    }


    if (
        !loadAnalytics
    ) {

        return unavailableResult({

            reason:
                ENERGY_BALANCE_REASON
                    .LOAD_ANALYTICS_UNAVAILABLE,

            sourceAnalytics,

            loadAnalytics,

            qualification:
                resolvedQualification,
        });
    }


    /*
    |--------------------------------------------------------------------------
    | Reporting windows
    |--------------------------------------------------------------------------
    */

    const reportingWindow =
        normalizeReportingWindow(
            sourceAnalytics,
            loadAnalytics
        );


    if (!reportingWindow) {

        return unavailableResult({

            reason:
                ENERGY_BALANCE_REASON
                    .INVALID_REPORTING_WINDOW,

            sourceAnalytics,

            loadAnalytics,

            qualification:
                resolvedQualification,
        });
    }


    /*
    |--------------------------------------------------------------------------
    | Semantic qualification
    |--------------------------------------------------------------------------
    */

    if (
        resolvedQualification
            .temporalAlignmentEstablished !==
        true
    ) {

        return unavailableResult({

            reason:
                ENERGY_BALANCE_REASON
                    .TEMPORAL_ALIGNMENT_NOT_ESTABLISHED,

            sourceAnalytics,

            loadAnalytics,

            qualification:
                resolvedQualification,

            evidence: {
                reportingWindow,
            },
        });
    }


    if (
        resolvedQualification
            .gridImportDirectionEstablished !==
        true
    ) {

        return unavailableResult({

            reason:
                ENERGY_BALANCE_REASON
                    .GRID_IMPORT_DIRECTION_NOT_ESTABLISHED,

            sourceAnalytics,

            loadAnalytics,

            qualification:
                resolvedQualification,
        });
    }


    if (
        resolvedQualification
            .generatorSupplyDirectionEstablished !==
        true
    ) {

        return unavailableResult({

            reason:
                ENERGY_BALANCE_REASON
                    .GENERATOR_SUPPLY_DIRECTION_NOT_ESTABLISHED,

            sourceAnalytics,

            loadAnalytics,

            qualification:
                resolvedQualification,
        });
    }


    if (
        resolvedQualification
            .solarGenerationDirectionEstablished !==
        true
    ) {

        return unavailableResult({

            reason:
                ENERGY_BALANCE_REASON
                    .SOLAR_GENERATION_DIRECTION_NOT_ESTABLISHED,

            sourceAnalytics,

            loadAnalytics,

            qualification:
                resolvedQualification,
        });
    }


    if (
        resolvedQualification
            .batteryDirectionEstablished !==
        true
    ) {

        return unavailableResult({

            reason:
                ENERGY_BALANCE_REASON
                    .BATTERY_DIRECTION_NOT_ESTABLISHED,

            sourceAnalytics,

            loadAnalytics,

            qualification:
                resolvedQualification,
        });
    }


    /*
    |--------------------------------------------------------------------------
    | Source availability
    |--------------------------------------------------------------------------
    */

    const grid =
        sourceAnalytics
            .sources
            .grid;

    const generator =
        sourceAnalytics
            .sources
            .generator;

    const solar =
        sourceAnalytics
            .sources
            .solar;


    if (
        !sourceStatusAvailable(
            grid
        )
    ) {

        return unavailableResult({

            reason:
                ENERGY_BALANCE_REASON
                    .GRID_ENERGY_UNAVAILABLE,

            sourceAnalytics,

            loadAnalytics,

            qualification:
                resolvedQualification,
        });
    }


    if (
        !sourceStatusAvailable(
            generator
        )
    ) {

        return unavailableResult({

            reason:
                ENERGY_BALANCE_REASON
                    .GENERATOR_ENERGY_UNAVAILABLE,

            sourceAnalytics,

            loadAnalytics,

            qualification:
                resolvedQualification,
        });
    }


    if (
        !sourceStatusAvailable(
            solar
        )
    ) {

        return unavailableResult({

            reason:
                ENERGY_BALANCE_REASON
                    .SOLAR_ENERGY_UNAVAILABLE,

            sourceAnalytics,

            loadAnalytics,

            qualification:
                resolvedQualification,
        });
    }


    if (
        !loadStatusAvailable(
            loadAnalytics
        )
    ) {

        return unavailableResult({

            reason:
                ENERGY_BALANCE_REASON
                    .SERVED_LOAD_ENERGY_UNAVAILABLE,

            sourceAnalytics,

            loadAnalytics,

            qualification:
                resolvedQualification,
        });
    }


    /*
    |--------------------------------------------------------------------------
    | Energy values
    |--------------------------------------------------------------------------
    */

    const gridEnergyKwh =
        getSourceEnergy(
            sourceAnalytics,
            "grid"
        );

    const generatorEnergyKwh =
        getSourceEnergy(
            sourceAnalytics,
            "generator"
        );

    const solarEnergyKwh =
        getSourceEnergy(
            sourceAnalytics,
            "solar"
        );

    const servedLoadEnergyKwh =
        getServedLoadEnergy(
            loadAnalytics
        );


    const batteryChargeEnergyKwh =
        finite(
            batteryDirectionalEnergy
                ?.chargeEnergyKwh
        )
            ? batteryDirectionalEnergy
                .chargeEnergyKwh
            : null;


    const batteryDischargeEnergyKwh =
        finite(
            batteryDirectionalEnergy
                ?.dischargeEnergyKwh
        )
            ? batteryDirectionalEnergy
                .dischargeEnergyKwh
            : null;


    /*
    |--------------------------------------------------------------------------
    | Availability of required energies
    |--------------------------------------------------------------------------
    */

    if (
        gridEnergyKwh ===
        null
    ) {

        return unavailableResult({

            reason:
                ENERGY_BALANCE_REASON
                    .GRID_ENERGY_UNAVAILABLE,

            sourceAnalytics,

            loadAnalytics,

            qualification:
                resolvedQualification,
        });
    }


    if (
        generatorEnergyKwh ===
        null
    ) {

        return unavailableResult({

            reason:
                ENERGY_BALANCE_REASON
                    .GENERATOR_ENERGY_UNAVAILABLE,

            sourceAnalytics,

            loadAnalytics,

            qualification:
                resolvedQualification,
        });
    }


    if (
        solarEnergyKwh ===
        null
    ) {

        return unavailableResult({

            reason:
                ENERGY_BALANCE_REASON
                    .SOLAR_ENERGY_UNAVAILABLE,

            sourceAnalytics,

            loadAnalytics,

            qualification:
                resolvedQualification,
        });
    }


    if (
        batteryChargeEnergyKwh ===
        null
    ) {

        return unavailableResult({

            reason:
                ENERGY_BALANCE_REASON
                    .BATTERY_CHARGE_ENERGY_UNAVAILABLE,

            sourceAnalytics,

            loadAnalytics,

            qualification:
                resolvedQualification,
        });
    }


    if (
        batteryDischargeEnergyKwh ===
        null
    ) {

        return unavailableResult({

            reason:
                ENERGY_BALANCE_REASON
                    .BATTERY_DISCHARGE_ENERGY_UNAVAILABLE,

            sourceAnalytics,

            loadAnalytics,

            qualification:
                resolvedQualification,
        });
    }


    if (
        servedLoadEnergyKwh ===
        null
    ) {

        return unavailableResult({

            reason:
                ENERGY_BALANCE_REASON
                    .SERVED_LOAD_ENERGY_UNAVAILABLE,

            sourceAnalytics,

            loadAnalytics,

            qualification:
                resolvedQualification,
        });
    }


    /*
    |--------------------------------------------------------------------------
    | Physical sanity
    |--------------------------------------------------------------------------
    */

    const supplyValues = [
        gridEnergyKwh,
        generatorEnergyKwh,
        solarEnergyKwh,
    ];


    if (
        supplyValues.some(
            (
                value
            ) =>
                value <
                0
        )
    ) {

        return unavailableResult({

            reason:
                ENERGY_BALANCE_REASON
                    .NEGATIVE_SUPPLY_ENERGY,

            sourceAnalytics,

            loadAnalytics,

            qualification:
                resolvedQualification,
        });
    }


    if (
        batteryChargeEnergyKwh <
            0 ||
        batteryDischargeEnergyKwh <
            0
    ) {

        return unavailableResult({

            reason:
                ENERGY_BALANCE_REASON
                    .NEGATIVE_BATTERY_DIRECTIONAL_ENERGY,

            sourceAnalytics,

            loadAnalytics,

            qualification:
                resolvedQualification,
        });
    }


    if (
        servedLoadEnergyKwh <
        0
    ) {

        return unavailableResult({

            reason:
                ENERGY_BALANCE_REASON
                    .NEGATIVE_SERVED_LOAD_ENERGY,

            sourceAnalytics,

            loadAnalytics,

            qualification:
                resolvedQualification,
        });
    }


    /*
    |--------------------------------------------------------------------------
    | Balance
    |--------------------------------------------------------------------------
    */

    const primarySupplyEnergyKwh =
        gridEnergyKwh +
        generatorEnergyKwh +
        solarEnergyKwh;


    const qualifiedSupplyEnergyKwh =
        primarySupplyEnergyKwh +
        batteryDischargeEnergyKwh -
        batteryChargeEnergyKwh;


    const residualKwh =
        qualifiedSupplyEnergyKwh -
        servedLoadEnergyKwh;


    /*
     * Error denominator is gross energy entering the reconciliation:
     *
     * primary supply + battery discharge
     *
     * Battery charging is treated as internal energy absorption.
     */

    const grossInputEnergyKwh =
        primarySupplyEnergyKwh +
        batteryDischargeEnergyKwh;


    if (
        grossInputEnergyKwh <=
        0
    ) {

        return unavailableResult({

            reason:
                ENERGY_BALANCE_REASON
                    .TOTAL_INPUT_ENERGY_NOT_POSITIVE,

            sourceAnalytics,

            loadAnalytics,

            qualification:
                resolvedQualification,
        });
    }


    const errorPercent =
        (
            Math.abs(
                residualKwh
            ) /
            grossInputEnergyKwh
        ) *
        100;


    /*
    |--------------------------------------------------------------------------
    | Propagate partial status
    |--------------------------------------------------------------------------
    */

    const inputStatuses = [

        grid.status,
        generator.status,
        solar.status,
        loadAnalytics.status,
    ];


    const partial =
        inputStatuses.some(
            (
                status
            ) =>
                status ===
                ENERGY_BALANCE_STATUS
                    .PARTIALLY_CALCULATED
        );


    const status =
        partial
            ? ENERGY_BALANCE_STATUS
                .PARTIALLY_CALCULATED
            : ENERGY_BALANCE_STATUS
                .CALCULATED;


    const reason =
        partial
            ? ENERGY_BALANCE_REASON
                .PARTIAL_INPUT_COVERAGE
            : ENERGY_BALANCE_REASON
                .QUALIFIED;


    const commonMetadata = {

        primarySupplyEnergyKwh:
            round(
                primarySupplyEnergyKwh
            ),

        gridEnergyKwh:
            round(
                gridEnergyKwh
            ),

        generatorEnergyKwh:
            round(
                generatorEnergyKwh
            ),

        solarEnergyKwh:
            round(
                solarEnergyKwh
            ),

        batteryChargeEnergyKwh:
            round(
                batteryChargeEnergyKwh
            ),

        batteryDischargeEnergyKwh:
            round(
                batteryDischargeEnergyKwh
            ),

        servedLoadEnergyKwh:
            round(
                servedLoadEnergyKwh
            ),
    };


    return {

        family:
            "ENERGY_BALANCE",

        status,

        reason,

        reportingWindow,

        qualification:
            resolvedQualification,

        metrics: [

            buildAvailableMetric({

                key:
                    "qualifiedSupplyEnergyKwh",

                label:
                    "Qualified Supply Energy",

                unit:
                    "kWh",

                value:
                    qualifiedSupplyEnergyKwh,

                status,

                reason,

                metadata:
                    commonMetadata,
            }),

            buildAvailableMetric({

                key:
                    "qualifiedServedLoadEnergyKwh",

                label:
                    "Qualified Served Load Energy",

                unit:
                    "kWh",

                value:
                    servedLoadEnergyKwh,

                status,

                reason,

                metadata:
                    commonMetadata,
            }),

            buildAvailableMetric({

                key:
                    "energyBalanceResidualKwh",

                label:
                    "Energy Balance Residual",

                unit:
                    "kWh",

                value:
                    residualKwh,

                status,

                reason,

                metadata:
                    commonMetadata,
            }),

            buildAvailableMetric({

                key:
                    "energyBalanceErrorPercent",

                label:
                    "Energy Balance Error",

                unit:
                    "%",

                value:
                    errorPercent,

                status,

                reason,

                metadata: {

                    ...commonMetadata,

                    denominator:
                        "PRIMARY_SUPPLY + BATTERY_DISCHARGE",
                },
            }),
        ],

        evidence: {

            sourceStatuses: {

                grid:
                    grid.status,

                generator:
                    generator.status,

                solar:
                    solar.status,
            },

            loadStatus:
                loadAnalytics.status,
        },

        boundaries:
            ENERGY_BALANCE_BOUNDARIES,
    };
}


/*
|--------------------------------------------------------------------------
| Metric lookup
|--------------------------------------------------------------------------
*/

export function getEnergyBalanceMetric(
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