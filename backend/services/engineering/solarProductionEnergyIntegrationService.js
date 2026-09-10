// services/engineering/solarProductionEnergyIntegrationService.js

import {
    SOLAR_ENERGY_ANALYTICS_STATUS,
    calculateSolarEnergyAnalytics,
} from "./solarEnergyAnalyticsService.js";


/*
|--------------------------------------------------------------------------
| ASHMAAN
| Phase 8.7H-D — Production Solar Energy / Yield Integration
|--------------------------------------------------------------------------
|
| PURPOSE
|
| Integrate the already-validated Phase 8.7D
| calculateSolarEnergyAnalytics() service into the production Solar pipeline.
|
| INPUT
|
| - canonical Phase 8.7H-C production Solar result
| - complete H-A/H-B production record array
| - canonical H-C Solar power result preserved unchanged
| - optional explicit Solar Charger deviceInstance selection
| - optional 8.7D calculator configuration
|
| OUTPUT
|
| - analytics.energy populated with the canonical Phase 8.7D result
| - phase advanced from 8.7H-C to 8.7H-D
| - H-C analytics.power preserved intact
|
| ARCHITECTURAL BOUNDARY
|
| This service DOES NOT:
|
| - reimplement Solar energy/yield calculations
| - calculate energy by integrating attr442 power
| - infer kWh from magnitude, labels or attribute identity
| - sum repeated daily-yield observations
| - sum attr94 + attr96 + attr285 + attr340
| - infer cumulative-counter reset semantics
| - infer interval semantics for attr340
| - aggregate multiple Solar Chargers automatically
| - convert missing telemetry to zero
| - treat zero yield as failure/unavailability
| - calculate operating state
| - calculate performance ratio
| - calculate capacity factor
| - calculate Solar functional availability
| - infer installed PV capacity
|
| Canonical Phase 8.7D evidence remains authoritative:
|
| - attr94  = current-day Solar Charger yield evidence
| - attr96  = previous-day Solar Charger yield evidence
| - attr285 = conditional counter-like user-yield evidence
| - attr340 = conditional yield-delta evidence
| - VALID RAW and [start,end) qualification remains owned by 8.7D
|--------------------------------------------------------------------------
*/


/*
|--------------------------------------------------------------------------
| Identity
|--------------------------------------------------------------------------
*/

export const SOLAR_PRODUCTION_ENERGY_PHASE =
    "8.7H-D";


export const SOLAR_PRODUCTION_ENERGY_INTEGRATION_STATUS =
    Object.freeze({
        INTEGRATED:
            "INTEGRATED",

        NOT_INTEGRATED:
            "NOT_INTEGRATED",
    });


export const SOLAR_PRODUCTION_ENERGY_REASON =
    Object.freeze({
        INTEGRATION_COMPLETE:
            "INTEGRATION_COMPLETE",

        PRODUCTION_SOLAR_SITE_RESULT_REQUIRED:
            "PRODUCTION_SOLAR_SITE_RESULT_REQUIRED",

        INVALID_SOLAR_FAMILY:
            "INVALID_SOLAR_FAMILY",

        INVALID_PRODUCTION_LAYER:
            "INVALID_PRODUCTION_LAYER",

        INVALID_H_C_PHASE:
            "INVALID_H_C_PHASE",

        POWER_INTEGRATION_REQUIRED:
            "POWER_INTEGRATION_REQUIRED",

        INVALID_REPORTING_WINDOW:
            "INVALID_REPORTING_WINDOW",

        INVALID_REPORTING_WINDOW_SEMANTICS:
            "INVALID_REPORTING_WINDOW_SEMANTICS",

        PRODUCTION_EVIDENCE_REQUIRED:
            "PRODUCTION_EVIDENCE_REQUIRED",

        PRODUCTION_RECORDS_REQUIRED:
            "PRODUCTION_RECORDS_REQUIRED",
    });


/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

function asDate(
    value
) {
    if (
        value === null ||
        value === undefined
    ) {
        return null;
    }

    const date =
        value instanceof Date
            ? value
            : new Date(
                value
            );

    return Number.isFinite(
        date.getTime()
    )
        ? date
        : null;
}


function normalizeDeviceInstance(
    value
) {
    if (
        value === null ||
        value === undefined ||
        String(
            value
        ).trim() ===
            ""
    ) {
        return null;
    }

    return String(
        value
    );
}


/*
|--------------------------------------------------------------------------
| H-C production shell validation
|--------------------------------------------------------------------------
|
| H-D accepts only the completed canonical H-C Solar production result.
|
| Important:
|
| A CALCULATED / PARTIALLY_CALCULATED Solar-power engineering value is NOT
| required. H-C execution itself is required. A site can legitimately have
| H-C power integration executed with engineering status UNAVAILABLE.
|--------------------------------------------------------------------------
*/

export function validateProductionSolarEnergyInput(
    siteResult
) {
    if (
        !siteResult ||
        typeof siteResult !==
            "object"
    ) {
        return {
            valid:
                false,

            reason:
                SOLAR_PRODUCTION_ENERGY_REASON
                    .PRODUCTION_SOLAR_SITE_RESULT_REQUIRED,
        };
    }


    if (
        siteResult.family !==
        "SOLAR"
    ) {
        return {
            valid:
                false,

            reason:
                SOLAR_PRODUCTION_ENERGY_REASON
                    .INVALID_SOLAR_FAMILY,
        };
    }


    if (
        siteResult.layer !==
        "PRODUCTION"
    ) {
        return {
            valid:
                false,

            reason:
                SOLAR_PRODUCTION_ENERGY_REASON
                    .INVALID_PRODUCTION_LAYER,
        };
    }


    if (
        siteResult.phase !==
        "8.7H-C"
    ) {
        return {
            valid:
                false,

            reason:
                SOLAR_PRODUCTION_ENERGY_REASON
                    .INVALID_H_C_PHASE,
        };
    }


    if (
        siteResult
            ?.analytics
            ?.power
            ?.integrationStatus !==
        "INTEGRATED"
    ) {
        return {
            valid:
                false,

            reason:
                SOLAR_PRODUCTION_ENERGY_REASON
                    .POWER_INTEGRATION_REQUIRED,
        };
    }


    const start =
        asDate(
            siteResult
                ?.reportingWindow
                ?.start
        );

    const end =
        asDate(
            siteResult
                ?.reportingWindow
                ?.end
        );


    if (
        !start ||
        !end ||
        start >=
            end
    ) {
        return {
            valid:
                false,

            reason:
                SOLAR_PRODUCTION_ENERGY_REASON
                    .INVALID_REPORTING_WINDOW,
        };
    }


    if (
        siteResult
            ?.reportingWindow
            ?.semantics !==
        "[start,end)"
    ) {
        return {
            valid:
                false,

            reason:
                SOLAR_PRODUCTION_ENERGY_REASON
                    .INVALID_REPORTING_WINDOW_SEMANTICS,
        };
    }


    if (
        !siteResult.evidence ||
        typeof siteResult.evidence !==
            "object"
    ) {
        return {
            valid:
                false,

            reason:
                SOLAR_PRODUCTION_ENERGY_REASON
                    .PRODUCTION_EVIDENCE_REQUIRED,
        };
    }


    if (
        !Array.isArray(
            siteResult
                .evidence
                .records
        )
    ) {
        return {
            valid:
                false,

            reason:
                SOLAR_PRODUCTION_ENERGY_REASON
                    .PRODUCTION_RECORDS_REQUIRED,
        };
    }


    return {
        valid:
            true,

        reason:
            null,

        reportingWindow: {
            start,
            end,
            semantics:
                "[start,end)",
        },
    };
}


/*
|--------------------------------------------------------------------------
| Diagnostics
|--------------------------------------------------------------------------
|
| Diagnostics expose evidence counts and canonical 8.7D classification.
| They do not calculate or reinterpret engineering energy.
|--------------------------------------------------------------------------
*/

export function buildProductionSolarEnergyDiagnostics({
    records = [],
    solarEnergy = null,
    selectedDeviceInstance = null,
    config = {},
} = {}) {
    const actualRecords =
        Array.isArray(
            records
        )
            ? records
            : [];

    const attributeCounts =
        new Map();


    for (
        const record of
        actualRecords
    ) {
        const id =
            Number(
                record
                    ?.vrmAttributeId
            );

        if (
            !Number.isFinite(
                id
            )
        ) {
            continue;
        }

        attributeCounts.set(
            id,
            (
                attributeCounts.get(
                    id
                ) ??
                0
            ) +
            1
        );
    }


    return {
        productionRecordCount:
            actualRecords.length,

        attr94YieldTodayRecordCount:
            attributeCounts.get(
                94
            ) ??
            0,

        attr96YieldYesterdayRecordCount:
            attributeCounts.get(
                96
            ) ??
            0,

        attr285UserYieldRecordCount:
            attributeCounts.get(
                285
            ) ??
            0,

        attr340YieldDeltaRecordCount:
            attributeCounts.get(
                340
            ) ??
            0,

        selectedDeviceInstance:
            normalizeDeviceInstance(
                selectedDeviceInstance
            ),

        calculatorStatus:
            solarEnergy
                ?.status ??
            null,

        calculatorReason:
            solarEnergy
                ?.reason ??
            null,

        canonicalReportingWindowEnergyCalculated:
            solarEnergy
                ?.energy
                ?.calculated ??
            false,

        canonicalReportingWindowEnergyValue:
            solarEnergy
                ?.energy
                ?.value ??
            null,

        canonicalReportingWindowEnergyUnit:
            solarEnergy
                ?.energy
                ?.unit ??
            null,

        qualifiedInputRecordCount:
            solarEnergy
                ?.evidence
                ?.qualifiedInputRecords ??
            0,

        solarEnergyCandidateRecordCount:
            solarEnergy
                ?.evidence
                ?.solarEnergyCandidateRecords ??
            0,

        yieldTodayStatus:
            solarEnergy
                ?.sources
                ?.yieldToday
                ?.status ??
            null,

        yieldYesterdayStatus:
            solarEnergy
                ?.sources
                ?.yieldYesterday
                ?.status ??
            null,

        userYieldStatus:
            solarEnergy
                ?.sources
                ?.userYield
                ?.status ??
            null,

        userYieldDeltaStatus:
            solarEnergy
                ?.sources
                ?.userYieldDelta
                ?.status ??
            null,

        requireValidQuality:
            config
                ?.requireValidQuality ??
            true,

        requireRawAggregation:
            config
                ?.requireRawAggregation ??
            true,
    };
}


/*
|--------------------------------------------------------------------------
| Calculator delegation
|--------------------------------------------------------------------------
|
| H-D passes the COMPLETE H-A/H-B record array into validated 8.7D.
|
| No pre-filtering, mapping, cloning or rewriting occurs here.
|--------------------------------------------------------------------------
*/

export function calculateProductionSolarEnergy({
    records = [],
    start,
    end,
    selectedDeviceInstance = null,
    config = {},
    solarEnergyCalculator =
        calculateSolarEnergyAnalytics,
} = {}) {
    if (
        typeof solarEnergyCalculator !==
        "function"
    ) {
        throw new Error(
            "solarEnergyCalculator must be a function."
        );
    }


    return solarEnergyCalculator({
        records,
        start,
        end,
        selectedDeviceInstance,
        config,
    });
}


/*
|--------------------------------------------------------------------------
| Canonical H-D integration
|--------------------------------------------------------------------------
*/

export function integrateProductionSolarEnergy({
    siteResult,
    selectedDeviceInstance = null,
    config = {},
    solarEnergyCalculator =
        calculateSolarEnergyAnalytics,
} = {}) {
    const validation =
        validateProductionSolarEnergyInput(
            siteResult
        );


    if (
        validation.valid !==
        true
    ) {
        throw new Error(
            `Invalid H-C production Solar result: ${validation.reason}`
        );
    }


    if (
        typeof solarEnergyCalculator !==
        "function"
    ) {
        throw new Error(
            "solarEnergyCalculator must be a function."
        );
    }


    /*
     * Preserve the exact H-A/H-B production record-array reference.
     */
    const records =
        siteResult
            .evidence
            .records;


    const solarEnergy =
        calculateProductionSolarEnergy({
            records,

            start:
                siteResult
                    .reportingWindow
                    .start,

            end:
                siteResult
                    .reportingWindow
                    .end,

            selectedDeviceInstance,

            config,

            solarEnergyCalculator,
        });


    /*
     * Shallow structural copy only.
     *
     * H-C Solar power and all upstream evidence objects remain intact.
     */
    return {
        ...siteResult,

        phase:
            SOLAR_PRODUCTION_ENERGY_PHASE,

        analytics: {
            ...(
                siteResult.analytics ??
                {}
            ),

            energy: {
                integrationStatus:
                    SOLAR_PRODUCTION_ENERGY_INTEGRATION_STATUS
                        .INTEGRATED,

                phase:
                    SOLAR_PRODUCTION_ENERGY_PHASE,

                reason:
                    SOLAR_PRODUCTION_ENERGY_REASON
                        .INTEGRATION_COMPLETE,

                value:
                    solarEnergy,

                diagnostics:
                    buildProductionSolarEnergyDiagnostics({
                        records,
                        solarEnergy,
                        selectedDeviceInstance,
                        config,
                    }),
            },
        },

        boundaries: {
            ...(
                siteResult.boundaries ??
                {}
            ),

            /*
             * H-D executed the canonical energy/yield integration.
             *
             * "energyIntegrated" means the validated analytics service ran.
             * "energyCalculated" means it produced a canonical reporting-window
             * energy quantity. Under current 8.7D semantics this normally
             * remains false because interval/counter semantics are unresolved.
             */
            solarEnergyIntegrated:
                true,

            yieldIntegrated:
                true,

            energyCalculated:
                solarEnergy
                    ?.energy
                    ?.calculated ===
                true,

            /*
             * Explicit semantic safety boundaries.
             */
            missingMeansZero:
                false,

            zeroYieldMeansFailure:
                false,

            zeroYieldMeansUnavailable:
                false,

            energyUnitInferred:
                false,

            unresolvedYieldLabelledKwh:
                false,

            repeatedDailySamplesSummed:
                false,

            dailyAndCounterYieldSummed:
                false,

            counterDecreaseLabelledReset:
                false,

            yieldDeltaAutomaticallyAccumulated:
                false,

            multipleSolarChargersAutomaticallyAggregated:
                false,

            powerIntegratedAsEnergy:
                false,

            installedCapacityInferred:
                false,

            /*
             * Downstream phases remain reserved.
             */
            operatingStateCalculated:
                false,

            performanceCalculated:
                false,

            availabilityCalculated:
                false,
        },
    };
}


/*
|--------------------------------------------------------------------------
| Availability helpers
|--------------------------------------------------------------------------
|
| Adapter execution and engineering evidence availability are distinct.
|--------------------------------------------------------------------------
*/

export function isProductionSolarEnergyAvailable(
    result
) {
    const status =
        result
            ?.analytics
            ?.energy
            ?.value
            ?.status;

    return (
        status ===
            SOLAR_ENERGY_ANALYTICS_STATUS
                .CALCULATED ||
        status ===
            SOLAR_ENERGY_ANALYTICS_STATUS
                .PARTIALLY_CALCULATED
    );
}


export function isProductionSolarEnergyUnavailable(
    result
) {
    return (
        result
            ?.analytics
            ?.energy
            ?.value
            ?.status ===
        SOLAR_ENERGY_ANALYTICS_STATUS
            .UNAVAILABLE
    );
}


/*
|--------------------------------------------------------------------------
| Semantic boundary audit
|--------------------------------------------------------------------------
*/

export function auditProductionSolarEnergyBoundaries(
    result
) {
    return {
        integrationExecuted:
            result
                ?.analytics
                ?.energy
                ?.integrationStatus ===
            SOLAR_PRODUCTION_ENERGY_INTEGRATION_STATUS
                .INTEGRATED,

        phaseAdvancedToHD:
            result
                ?.phase ===
            SOLAR_PRODUCTION_ENERGY_PHASE,

        reportingWindowSemanticsPreserved:
            result
                ?.reportingWindow
                ?.semantics ===
            "[start,end)",

        powerPreserved:
            result
                ?.analytics
                ?.power
                ?.integrationStatus ===
            "INTEGRATED",

        missingNotZero:
            result
                ?.boundaries
                ?.missingMeansZero ===
            false,

        zeroYieldNotFailure:
            result
                ?.boundaries
                ?.zeroYieldMeansFailure ===
            false,

        zeroYieldNotUnavailable:
            result
                ?.boundaries
                ?.zeroYieldMeansUnavailable ===
            false,

        unitNotInferred:
            result
                ?.boundaries
                ?.energyUnitInferred ===
            false,

        unresolvedYieldNotKwh:
            result
                ?.boundaries
                ?.unresolvedYieldLabelledKwh ===
            false,

        repeatedDailySamplesNotSummed:
            result
                ?.boundaries
                ?.repeatedDailySamplesSummed ===
            false,

        evidenceFamiliesNotSummed:
            result
                ?.boundaries
                ?.dailyAndCounterYieldSummed ===
            false,

        counterResetNotInferred:
            result
                ?.boundaries
                ?.counterDecreaseLabelledReset ===
            false,

        yieldDeltaNotAutomaticallyAccumulated:
            result
                ?.boundaries
                ?.yieldDeltaAutomaticallyAccumulated ===
            false,

        multipleDevicesNotAutomaticallyAggregated:
            result
                ?.boundaries
                ?.multipleSolarChargersAutomaticallyAggregated ===
            false,

        powerNotIntegratedAsEnergy:
            result
                ?.boundaries
                ?.powerIntegratedAsEnergy ===
            false,

        installedCapacityNotInferred:
            result
                ?.boundaries
                ?.installedCapacityInferred ===
            false,

        operatingStateStillReserved:
            result
                ?.boundaries
                ?.operatingStateCalculated ===
            false,

        performanceStillReserved:
            result
                ?.boundaries
                ?.performanceCalculated ===
            false,

        availabilityStillReserved:
            result
                ?.boundaries
                ?.availabilityCalculated ===
            false,
    };
}


export default Object.freeze({
    SOLAR_PRODUCTION_ENERGY_PHASE,
    SOLAR_PRODUCTION_ENERGY_INTEGRATION_STATUS,
    SOLAR_PRODUCTION_ENERGY_REASON,

    validateProductionSolarEnergyInput,
    buildProductionSolarEnergyDiagnostics,
    calculateProductionSolarEnergy,
    integrateProductionSolarEnergy,
    isProductionSolarEnergyAvailable,
    isProductionSolarEnergyUnavailable,
    auditProductionSolarEnergyBoundaries,
});
