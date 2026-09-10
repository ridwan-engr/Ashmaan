// services/engineering/gridEnergyAnalyticsService.js

import {
    GRID_POWER_ANALYTICS_STATUS,
    calculateGridPowerAnalytics,
} from "./gridPowerAnalyticsService.js";

import {
    GRID_POWER_UNIT,
} from "./gridPowerTopologyService.js";


/*
|--------------------------------------------------------------------------
| Phase 8.6E
| Grid Energy Analytics
|--------------------------------------------------------------------------
|
| PURPOSE
|
| Integrate a qualified canonical grid-power series into signed grid energy.
|
| Energy calculation is permitted ONLY when:
|
| - 8.6D-D produced canonical grid-power samples
| - the canonical power unit is explicitly qualified as W or kW
| - at least two usable power samples exist
| - consecutive samples satisfy the maximum integration gap
|
| Integration method:
|
|     trapezoidal rule
|
| For W:
|
|     E_kWh = ((P1 + P2) / 2) * dt_hours / 1000
|
| For kW:
|
|     E_kWh = ((P1 + P2) / 2) * dt_hours
|
| IMPORTANT:
|
| Signed energy is preserved.
|
| Positive/negative energy is NOT labelled import/export because Phase 8.6
| has not established grid power direction semantics.
|
| This service deliberately DOES NOT:
|
| - infer W or kW from magnitude
| - infer import/export direction
| - split import/export energy
| - substitute generic VRM "kwh"
| - substitute served-load energy
| - bridge long telemetry gaps
| - extrapolate before first or after last power sample
| - infer outage
| - infer service interruption
| - infer grid availability
|--------------------------------------------------------------------------
*/


export const GRID_ENERGY_ANALYTICS_STATUS =
    Object.freeze({
        CALCULATED:
            "CALCULATED",

        PARTIALLY_CALCULATED:
            "PARTIALLY_CALCULATED",

        UNAVAILABLE:
            "UNAVAILABLE",
    });


export const GRID_ENERGY_ANALYTICS_REASON =
    Object.freeze({
        GRID_ENERGY_QUALIFIED:
            "GRID_ENERGY_QUALIFIED",

        GRID_ENERGY_PARTIAL:
            "GRID_ENERGY_PARTIAL",

        GRID_POWER_UNAVAILABLE:
            "GRID_POWER_UNAVAILABLE",

        GRID_POWER_UNIT_UNRESOLVED:
            "GRID_POWER_UNIT_UNRESOLVED",

        GRID_POWER_UNIT_CONFLICT:
            "GRID_POWER_UNIT_CONFLICT",

        INSUFFICIENT_POWER_SAMPLES:
            "INSUFFICIENT_POWER_SAMPLES",

        NO_QUALIFIED_INTEGRATION_INTERVALS:
            "NO_QUALIFIED_INTEGRATION_INTERVALS",

        INVALID_REPORTING_WINDOW:
            "INVALID_REPORTING_WINDOW",
    });


export const GRID_ENERGY_INTERVAL_REJECTION_REASON =
    Object.freeze({
        GAP_EXCEEDS_MAXIMUM:
            "GAP_EXCEEDS_MAXIMUM",

        NON_POSITIVE_INTERVAL:
            "NON_POSITIVE_INTERVAL",

        OUTSIDE_REPORTING_WINDOW:
            "OUTSIDE_REPORTING_WINDOW",
    });


export const DEFAULT_GRID_ENERGY_ANALYTICS_CONFIG =
    Object.freeze({
        maxGapMinutes:
            30,
    });


const EPSILON =
    1e-9;


/*
|--------------------------------------------------------------------------
| Basic helpers
|--------------------------------------------------------------------------
*/

function finiteNumber(
    value
) {

    if (
        value === null ||
        value === undefined
    ) {

        return null;
    }


    if (
        typeof value ===
        "boolean"
    ) {

        return null;
    }


    if (
        typeof value ===
            "string" &&
        value.trim() ===
            ""
    ) {

        return null;
    }


    const numeric =
        typeof value ===
            "number"
            ? value
            : Number(
                value
            );


    return Number.isFinite(
        numeric
    )
        ? numeric
        : null;
}


function asDate(
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


    return Number.isFinite(
        date.getTime()
    )
        ? date
        : null;
}


function clampPercent(
    value
) {

    if (
        !Number.isFinite(
            value
        )
    ) {

        return 0;
    }


    return Math.max(
        0,
        Math.min(
            100,
            value
        )
    );
}


/*
|--------------------------------------------------------------------------
| Canonical power sample normalization
|--------------------------------------------------------------------------
*/

export function normalizeGridPowerSamples(
    samples = []
) {

    return samples
        .map(
            (
                sample
            ) => {

                const timestamp =
                    asDate(
                        sample
                            ?.timestamp
                    );


                const totalRawPower =
                    finiteNumber(
                        sample
                            ?.totalRawPower
                    );


                if (
                    !timestamp ||
                    totalRawPower ===
                        null
                ) {

                    return null;
                }


                return {
                    ...sample,

                    timestamp,

                    totalRawPower,
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


/*
|--------------------------------------------------------------------------
| Reporting-window normalization
|--------------------------------------------------------------------------
|
| Explicit reporting window:
|
|     [start, end)
|
| A power sample exactly at `end` may still be retained as an integration
| endpoint so that the interval immediately before `end` can be integrated.
|
| No extrapolation is performed to either boundary.
|--------------------------------------------------------------------------
*/

export function resolveGridEnergyReportingWindow({
    samples = [],
    start = null,
    end = null,
} = {}) {

    const explicitStartProvided =
        start !== null &&
        start !== undefined;


    const explicitEndProvided =
        end !== null &&
        end !== undefined;


    if (
        explicitStartProvided !==
        explicitEndProvided
    ) {

        return {
            valid:
                false,

            explicit:
                true,

            start:
                null,

            end:
                null,

            reportingHours:
                0,
        };
    }


    if (
        explicitStartProvided &&
        explicitEndProvided
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
            startDate >=
                endDate
        ) {

            return {
                valid:
                    false,

                explicit:
                    true,

                start:
                    startDate,

                end:
                    endDate,

                reportingHours:
                    0,
            };
        }


        return {
            valid:
                true,

            explicit:
                true,

            start:
                startDate,

            end:
                endDate,

            reportingHours:
                (
                    endDate -
                    startDate
                ) /
                3_600_000,
        };
    }


    if (
        samples.length <
        2
    ) {

        return {
            valid:
                true,

            explicit:
                false,

            start:
                samples[0]
                    ?.timestamp ??
                null,

            end:
                samples[0]
                    ?.timestamp ??
                null,

            reportingHours:
                0,
        };
    }


    const inferredStart =
        samples[0]
            .timestamp;


    const inferredEnd =
        samples[
            samples.length -
            1
        ]
            .timestamp;


    return {
        valid:
            true,

        explicit:
            false,

        start:
            inferredStart,

        end:
            inferredEnd,

        reportingHours:
            (
                inferredEnd -
                inferredStart
            ) /
            3_600_000,
    };
}


/*
|--------------------------------------------------------------------------
| Unit conversion
|--------------------------------------------------------------------------
*/

export function powerToKilowatts({
    power,
    unit,
} = {}) {

    const numericPower =
        finiteNumber(
            power
        );


    if (
        numericPower ===
        null
    ) {

        return null;
    }


    if (
        unit ===
        GRID_POWER_UNIT.W
    ) {

        return numericPower /
            1000;
    }


    if (
        unit ===
        GRID_POWER_UNIT.KW
    ) {

        return numericPower;
    }


    return null;
}


/*
|--------------------------------------------------------------------------
| Trapezoidal interval integration
|--------------------------------------------------------------------------
*/

export function integrateGridPowerSeries({
    samples = [],
    unit,
    maxGapMinutes =
        DEFAULT_GRID_ENERGY_ANALYTICS_CONFIG
            .maxGapMinutes,
    reportingStart = null,
    reportingEnd = null,
} = {}) {

    const maximumGapMinutes =
        Number(
            maxGapMinutes
        );


    if (
        !Number.isFinite(
            maximumGapMinutes
        ) ||
        maximumGapMinutes <=
            0
    ) {

        throw new Error(
            "maxGapMinutes must be a finite number > 0."
        );
    }


    if (
        ![
            GRID_POWER_UNIT.W,
            GRID_POWER_UNIT.KW,
        ].includes(
            unit
        )
    ) {

        return {
            integratedIntervals:
                [],

            rejectedIntervals:
                [],

            signedEnergyKWh:
                null,

            integrationHours:
                0,

            intervalCount:
                0,
        };
    }


    const normalizedSamples =
        normalizeGridPowerSamples(
            samples
        );


    const start =
        reportingStart
            ? asDate(
                reportingStart
            )
            : null;


    const end =
        reportingEnd
            ? asDate(
                reportingEnd
            )
            : null;


    const maximumGapMs =
        maximumGapMinutes *
        60_000;


    const integratedIntervals =
        [];


    const rejectedIntervals =
        [];


    let signedEnergyKWh =
        0;


    let integrationHours =
        0;


    for (
        let index = 0;
        index <
            normalizedSamples.length -
            1;
        index +=
            1
    ) {

        const first =
            normalizedSamples[
                index
            ];


        const second =
            normalizedSamples[
                index +
                1
            ];


        const firstTime =
            first
                .timestamp
                .getTime();


        const secondTime =
            second
                .timestamp
                .getTime();


        const deltaMs =
            secondTime -
            firstTime;


        if (
            deltaMs <=
            0
        ) {

            rejectedIntervals.push({
                start:
                    first.timestamp,

                end:
                    second.timestamp,

                durationHours:
                    0,

                rejectionReason:
                    GRID_ENERGY_INTERVAL_REJECTION_REASON
                        .NON_POSITIVE_INTERVAL,
            });


            continue;
        }


        /*
         * Explicit reporting-window semantics.
         *
         * We do NOT manufacture synthetic values at the start/end
         * boundaries. Therefore only complete observed intervals that
         * lie inside the reporting window are integrated.
         */

        if (
            start &&
            first.timestamp <
                start
        ) {

            rejectedIntervals.push({
                start:
                    first.timestamp,

                end:
                    second.timestamp,

                durationHours:
                    deltaMs /
                    3_600_000,

                rejectionReason:
                    GRID_ENERGY_INTERVAL_REJECTION_REASON
                        .OUTSIDE_REPORTING_WINDOW,
            });


            continue;
        }


        if (
            end &&
            second.timestamp >
                end
        ) {

            rejectedIntervals.push({
                start:
                    first.timestamp,

                end:
                    second.timestamp,

                durationHours:
                    deltaMs /
                    3_600_000,

                rejectionReason:
                    GRID_ENERGY_INTERVAL_REJECTION_REASON
                        .OUTSIDE_REPORTING_WINDOW,
            });


            continue;
        }


        if (
            deltaMs >
            maximumGapMs
        ) {

            rejectedIntervals.push({
                start:
                    first.timestamp,

                end:
                    second.timestamp,

                durationHours:
                    deltaMs /
                    3_600_000,

                rejectionReason:
                    GRID_ENERGY_INTERVAL_REJECTION_REASON
                        .GAP_EXCEEDS_MAXIMUM,
            });


            continue;
        }


        const p1kW =
            powerToKilowatts({
                power:
                    first
                        .totalRawPower,

                unit,
            });


        const p2kW =
            powerToKilowatts({
                power:
                    second
                        .totalRawPower,

                unit,
            });


        if (
            p1kW ===
                null ||
            p2kW ===
                null
        ) {

            continue;
        }


        const durationHours =
            deltaMs /
            3_600_000;


        const averagePowerKW =
            (
                p1kW +
                p2kW
            ) /
            2;


        const intervalEnergyKWh =
            averagePowerKW *
            durationHours;


        signedEnergyKWh +=
            intervalEnergyKWh;


        integrationHours +=
            durationHours;


        integratedIntervals.push({
            start:
                first.timestamp,

            end:
                second.timestamp,

            durationHours,

            startRawPower:
                first
                    .totalRawPower,

            endRawPower:
                second
                    .totalRawPower,

            startPowerKW:
                p1kW,

            endPowerKW:
                p2kW,

            averagePowerKW,

            signedEnergyKWh:
                intervalEnergyKWh,
        });
    }


    return {
        integratedIntervals,

        rejectedIntervals,

        signedEnergyKWh,

        integrationHours,

        intervalCount:
            integratedIntervals
                .length,
    };
}


/*
|--------------------------------------------------------------------------
| Semantic boundaries
|--------------------------------------------------------------------------
*/

function buildSemantics() {

    return {
        integrationMethod:
            "TRAPEZOIDAL",

        energyUnit:
            "kWh",

        signedEnergyPreserved:
            true,

        importEnergyEstablished:
            false,

        exportEnergyEstablished:
            false,

        positiveMeansImport:
            false,

        negativeMeansExport:
            false,

        powerDirectionEstablished:
            false,

        powerMagnitudeUsedToInferUnit:
            false,

        genericVrmKwhUsed:
            false,

        servedLoadUsedAsGridEnergy:
            false,

        longGapBridged:
            false,

        startBoundaryExtrapolated:
            false,

        endBoundaryExtrapolated:
            false,

        missingPowerAssumedZero:
            false,

        zeroPowerIsValid:
            true,

        zeroEnergyMeansOutage:
            false,

        outageEstablished:
            false,

        serviceInterruptionEstablished:
            false,

        gridAvailabilityEstablished:
            false,
    };
}


/*
|--------------------------------------------------------------------------
| Unavailable helper
|--------------------------------------------------------------------------
*/

function unavailableResult({
    reason,
    gridPower = null,
    reportingWindow = null,
    evidence = {},
    diagnostics = {},
}) {

    return {
        family:
            "GRID_ENERGY_ANALYTICS",

        status:
            GRID_ENERGY_ANALYTICS_STATUS
                .UNAVAILABLE,

        reason,

        source:
            gridPower
                ?.source ??
            null,

        energy: {
            signedEnergyKWh:
                null,

            integrationHours:
                0,

            reportingHours:
                reportingWindow
                    ?.reportingHours ??
                0,

            coveragePercent:
                0,

            integratedIntervalCount:
                0,

            rejectedIntervalCount:
                0,
        },

        integratedIntervals:
            [],

        rejectedIntervals:
            [],

        gridPower,

        evidence,

        diagnostics,

        semantics:
            buildSemantics(),
    };
}


/*
|--------------------------------------------------------------------------
| Public Grid Energy Analytics
|--------------------------------------------------------------------------
*/

export function calculateGridEnergyAnalytics({
    records = [],
    sourceStateIntervals = [],
    start = null,
    end = null,
    config = {},
} = {}) {

    const resolvedConfig =
        {
            ...DEFAULT_GRID_ENERGY_ANALYTICS_CONFIG,
            ...config,
        };


    /*
     * --------------------------------------------------------------
     * 1. Obtain the canonical 8.6D-D power result.
     * --------------------------------------------------------------
     */

    const gridPower =
        calculateGridPowerAnalytics({
            records,
            sourceStateIntervals,
            config:
                config
                    .gridPowerConfig ??
                {},
        });


    if (
        gridPower.status ===
            GRID_POWER_ANALYTICS_STATUS
                .UNAVAILABLE ||
        !Array.isArray(
            gridPower
                ?.power
                ?.samples
        ) ||
        gridPower
            .power
            .samples
            .length ===
            0
    ) {

        return unavailableResult({
            reason:
                GRID_ENERGY_ANALYTICS_REASON
                    .GRID_POWER_UNAVAILABLE,

            gridPower,

            evidence: {
                inputRecordCount:
                    records.length,

                gridPowerStatus:
                    gridPower
                        .status,

                gridPowerReason:
                    gridPower
                        .reason,
            },
        });
    }


    /*
     * --------------------------------------------------------------
     * 2. Unit gate.
     * --------------------------------------------------------------
     */

    const powerUnit =
        gridPower
            .power
            .unit;


    const powerUnitStatus =
        gridPower
            .power
            .unitStatus;


    if (
        powerUnitStatus ===
        "CONFLICT"
    ) {

        return unavailableResult({
            reason:
                GRID_ENERGY_ANALYTICS_REASON
                    .GRID_POWER_UNIT_CONFLICT,

            gridPower,

            evidence: {
                inputRecordCount:
                    records.length,

                powerUnit,

                powerUnitStatus,
            },
        });
    }


    if (
        ![
            GRID_POWER_UNIT.W,
            GRID_POWER_UNIT.KW,
        ].includes(
            powerUnit
        )
    ) {

        return unavailableResult({
            reason:
                GRID_ENERGY_ANALYTICS_REASON
                    .GRID_POWER_UNIT_UNRESOLVED,

            gridPower,

            evidence: {
                inputRecordCount:
                    records.length,

                powerUnit,

                powerUnitStatus,
            },

            diagnostics: {
                energyCalculationBlocked:
                    true,

                blockReason:
                    "QUALIFIED_W_OR_KW_REQUIRED",
            },
        });
    }


    /*
     * --------------------------------------------------------------
     * 3. Normalize canonical power samples.
     * --------------------------------------------------------------
     */

    const samples =
        normalizeGridPowerSamples(
            gridPower
                .power
                .samples
        );


    if (
        samples.length <
        2
    ) {

        return unavailableResult({
            reason:
                GRID_ENERGY_ANALYTICS_REASON
                    .INSUFFICIENT_POWER_SAMPLES,

            gridPower,

            evidence: {
                inputRecordCount:
                    records.length,

                canonicalPowerSampleCount:
                    samples.length,

                powerUnit,

                powerUnitStatus,
            },
        });
    }


    /*
     * --------------------------------------------------------------
     * 4. Resolve reporting window.
     * --------------------------------------------------------------
     */

    const reportingWindow =
        resolveGridEnergyReportingWindow({
            samples,
            start,
            end,
        });


    if (
        reportingWindow.valid !==
        true
    ) {

        return unavailableResult({
            reason:
                GRID_ENERGY_ANALYTICS_REASON
                    .INVALID_REPORTING_WINDOW,

            gridPower,

            reportingWindow,

            evidence: {
                canonicalPowerSampleCount:
                    samples.length,

                powerUnit,

                powerUnitStatus,
            },
        });
    }


    /*
     * --------------------------------------------------------------
     * 5. Integrate.
     * --------------------------------------------------------------
     */

    const integration =
        integrateGridPowerSeries({
            samples,

            unit:
                powerUnit,

            maxGapMinutes:
                resolvedConfig
                    .maxGapMinutes,

            reportingStart:
                reportingWindow
                    .explicit
                    ? reportingWindow
                        .start
                    : null,

            reportingEnd:
                reportingWindow
                    .explicit
                    ? reportingWindow
                        .end
                    : null,
        });


    if (
        integration.intervalCount ===
        0
    ) {

        return {
            ...unavailableResult({
                reason:
                    GRID_ENERGY_ANALYTICS_REASON
                        .NO_QUALIFIED_INTEGRATION_INTERVALS,

                gridPower,

                reportingWindow,

                evidence: {
                    canonicalPowerSampleCount:
                        samples.length,

                    powerUnit,

                    powerUnitStatus,

                    rejectedIntervalCount:
                        integration
                            .rejectedIntervals
                            .length,
                },
            }),

            rejectedIntervals:
                integration
                    .rejectedIntervals,
        };
    }


    /*
     * --------------------------------------------------------------
     * 6. Coverage.
     * --------------------------------------------------------------
     */

    const reportingHours =
        reportingWindow
            .reportingHours;


    const integrationHours =
        integration
            .integrationHours;


    const coveragePercent =
        reportingHours >
        0
            ? clampPercent(
                (
                    integrationHours /
                    reportingHours
                ) *
                100
            )
            : 0;


    /*
     * Full calculation requires:
     *
     * - no rejected power intervals
     * - integration exposure covers the reporting span
     *
     * No endpoint extrapolation is allowed, therefore an explicit
     * reporting window extending beyond observed power samples will
     * correctly remain PARTIALLY_CALCULATED.
     */

    const coverageComplete =
        reportingHours >
            0 &&
        Math.abs(
            integrationHours -
            reportingHours
        ) <=
            EPSILON;


    const fullyCalculated =
        integration
            .rejectedIntervals
            .length ===
            0 &&
        coverageComplete;


    return {
        family:
            "GRID_ENERGY_ANALYTICS",

        status:
            fullyCalculated
                ? GRID_ENERGY_ANALYTICS_STATUS
                    .CALCULATED
                : GRID_ENERGY_ANALYTICS_STATUS
                    .PARTIALLY_CALCULATED,

        reason:
            fullyCalculated
                ? GRID_ENERGY_ANALYTICS_REASON
                    .GRID_ENERGY_QUALIFIED
                : GRID_ENERGY_ANALYTICS_REASON
                    .GRID_ENERGY_PARTIAL,

        source:
            gridPower
                .source,

        energy: {
            signedEnergyKWh:
                integration
                    .signedEnergyKWh,

            integrationHours,

            reportingHours,

            coveragePercent,

            integratedIntervalCount:
                integration
                    .integratedIntervals
                    .length,

            rejectedIntervalCount:
                integration
                    .rejectedIntervals
                    .length,

            powerUnit,

            powerUnitStatus,

            energyUnit:
                "kWh",
        },

        reportingWindow: {
            explicit:
                reportingWindow
                    .explicit,

            start:
                reportingWindow
                    .start,

            end:
                reportingWindow
                    .end,

            semantics:
                "[start,end)",
        },

        integratedIntervals:
            integration
                .integratedIntervals,

        rejectedIntervals:
            integration
                .rejectedIntervals,

        gridPower,

        evidence: {
            inputRecordCount:
                records.length,

            canonicalPowerSampleCount:
                samples.length,

            integratedIntervalCount:
                integration
                    .integratedIntervals
                    .length,

            rejectedIntervalCount:
                integration
                    .rejectedIntervals
                    .length,

            powerUnit,

            powerUnitStatus,
        },

        diagnostics: {
            maxGapMinutes:
                Number(
                    resolvedConfig
                        .maxGapMinutes
                ),

            integrationMethod:
                "TRAPEZOIDAL",

            sourcePowerStatus:
                gridPower
                    .status,

            sourcePowerReason:
                gridPower
                    .reason,
        },

        semantics:
            buildSemantics(),
    };
}


export default {
    GRID_ENERGY_ANALYTICS_STATUS,
    GRID_ENERGY_ANALYTICS_REASON,
    GRID_ENERGY_INTERVAL_REJECTION_REASON,
    DEFAULT_GRID_ENERGY_ANALYTICS_CONFIG,
    normalizeGridPowerSamples,
    resolveGridEnergyReportingWindow,
    powerToKilowatts,
    integrateGridPowerSeries,
    calculateGridEnergyAnalytics,
};