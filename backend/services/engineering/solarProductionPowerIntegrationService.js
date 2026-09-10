// services/engineering/solarProductionPowerIntegrationService.js

import {
    SOLAR_POWER_ANALYTICS_STATUS,
    calculateSolarPowerAnalytics,
} from "./solarPowerAnalyticsService.js";


/*
|--------------------------------------------------------------------------
| ASHMAAN
| Phase 8.7H-C — Production Solar Power Integration
|--------------------------------------------------------------------------
|
| PURPOSE
|
| Connect the validated Phase 8.7H-A / 8.7H-B production Solar boundary
| to the already-validated Phase 8.7C calculateSolarPowerAnalytics()
| service.
|
| This module is intentionally an orchestration layer.
|
| It DOES NOT:
|
| - reimplement PV-power calculations
| - infer engineering units
| - infer installed Solar/PV capacity
| - infer Solar installation from settings telemetry
| - infer failure/unavailability from zero PV power
| - coerce missing telemetry to zero
| - substitute attr107 for PV-input power
| - sum attrs102/104 to fabricate PV generation
| - use attrs741/742 as generation evidence
| - automatically aggregate multiple Solar Chargers
| - calculate energy/yield
| - calculate operating state
| - calculate availability/performance
|
| Canonical Phase 8.7C boundaries remain authoritative:
|
| - attr442 = primary PV-input power
| - attr113 = conditional secondary DC-coupled PV power
| - attr107 = Solar Charger output/battery-side power only
| - attrs102/104 = flow context only
| - attrs741/742 = settings context only
| - VALID RAW telemetry only
| - reporting windows remain [start,end)
|--------------------------------------------------------------------------
*/


/*
|--------------------------------------------------------------------------
| Identity
|--------------------------------------------------------------------------
*/

export const SOLAR_PRODUCTION_POWER_PHASE =
    "8.7H-C";


export const SOLAR_PRODUCTION_POWER_INTEGRATION_STATUS =
    Object.freeze({
        INTEGRATED:
            "INTEGRATED",

        NOT_INTEGRATED:
            "NOT_INTEGRATED",
    });


export const SOLAR_PRODUCTION_POWER_REASON =
    Object.freeze({
        INTEGRATION_COMPLETE:
            "INTEGRATION_COMPLETE",

        PRODUCTION_SOLAR_SITE_RESULT_REQUIRED:
            "PRODUCTION_SOLAR_SITE_RESULT_REQUIRED",

        INVALID_SOLAR_FAMILY:
            "INVALID_SOLAR_FAMILY",

        INVALID_PRODUCTION_LAYER:
            "INVALID_PRODUCTION_LAYER",

        INVALID_H_B_PHASE:
            "INVALID_H_B_PHASE",

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
| H-B production shell validation
|--------------------------------------------------------------------------
|
| H-C accepts only the canonical H-B Solar production shell.
|
| The validator deliberately does NOT require Solar power evidence to exist.
| A valid Solar production shell may legitimately contain no attr442/attr113
| records in the reporting window.
|--------------------------------------------------------------------------
*/

export function validateProductionSolarSiteShell(
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
                SOLAR_PRODUCTION_POWER_REASON
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
                SOLAR_PRODUCTION_POWER_REASON
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
                SOLAR_PRODUCTION_POWER_REASON
                    .INVALID_PRODUCTION_LAYER,
        };
    }

    if (
        siteResult.phase !==
        "8.7H-B"
    ) {
        return {
            valid:
                false,

            reason:
                SOLAR_PRODUCTION_POWER_REASON
                    .INVALID_H_B_PHASE,
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
                SOLAR_PRODUCTION_POWER_REASON
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
                SOLAR_PRODUCTION_POWER_REASON
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
                SOLAR_PRODUCTION_POWER_REASON
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
                SOLAR_PRODUCTION_POWER_REASON
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
| Diagnostics are descriptive only.
| They do not participate in PV-power calculation.
|--------------------------------------------------------------------------
*/

export function buildProductionSolarPowerDiagnostics({
    records = [],
    solarPower = null,
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
        const record
        of actualRecords
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

        attr442RecordCount:
            attributeCounts.get(
                442
            ) ??
            0,

        attr113RecordCount:
            attributeCounts.get(
                113
            ) ??
            0,

        attr107ContextRecordCount:
            attributeCounts.get(
                107
            ) ??
            0,

        flowContextRecordCount:
            (
                attributeCounts.get(
                    102
                ) ??
                0
            ) +
            (
                attributeCounts.get(
                    104
                ) ??
                0
            ),

        settingsContextRecordCount:
            (
                attributeCounts.get(
                    741
                ) ??
                0
            ) +
            (
                attributeCounts.get(
                    742
                ) ??
                0
            ),

        selectedDeviceInstance:
            normalizeDeviceInstance(
                selectedDeviceInstance
            ),

        calculatorStatus:
            solarPower
                ?.status ??
            null,

        calculatorReason:
            solarPower
                ?.reason ??
            null,

        selectedPowerPath:
            solarPower
                ?.topology
                ?.selectedPath ??
            null,

        topologyStatus:
            solarPower
                ?.topology
                ?.status ??
            null,

        topologyAmbiguous:
            solarPower
                ?.topology
                ?.ambiguous ??
            null,

        unitStatus:
            solarPower
                ?.unit
                ?.status ??
            null,

        unit:
            solarPower
                ?.unit
                ?.value ??
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
| IMPORTANT
|
| The COMPLETE H-A/H-B production record array is passed to the validated
| 8.7C calculator.
|
| H-C performs no pre-filtering or rewriting. This preserves:
|
| - VALID RAW qualification in 8.7C
| - [start,end) filtering in 8.7C
| - attr442 primary-path precedence in 8.7C
| - attr113 conditional secondary-path rules in 8.7C
| - explicit multi-Solar-Charger topology handling in 8.7C
| - zero-value semantics in 8.7C
|--------------------------------------------------------------------------
*/

export function calculateProductionSolarPower({
    records = [],
    start,
    end,
    selectedDeviceInstance = null,
    config = {},
    solarPowerCalculator =
        calculateSolarPowerAnalytics,
} = {}) {
    if (
        typeof solarPowerCalculator !==
        "function"
    ) {
        throw new Error(
            "solarPowerCalculator must be a function."
        );
    }

    return solarPowerCalculator({
        records,
        start,
        end,
        selectedDeviceInstance,
        config,
    });
}


/*
|--------------------------------------------------------------------------
| Canonical H-C integration
|--------------------------------------------------------------------------
*/

export function integrateProductionSolarPower({
    siteResult,
    selectedDeviceInstance = null,
    config = {},
    solarPowerCalculator =
        calculateSolarPowerAnalytics,
} = {}) {
    const validation =
        validateProductionSolarSiteShell(
            siteResult
        );

    if (
        validation.valid !==
        true
    ) {
        throw new Error(
            `Invalid H-B production Solar result: ${validation.reason}`
        );
    }

    if (
        typeof solarPowerCalculator !==
        "function"
    ) {
        throw new Error(
            "solarPowerCalculator must be a function."
        );
    }

    /*
     * Preserve the exact H-A record-array reference.
     * Do not filter, map, clone or rewrite it here.
     */
    const records =
        siteResult
            .evidence
            .records;

    const solarPower =
        calculateProductionSolarPower({
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

            solarPowerCalculator,
        });

    /*
     * Shallow structural copy only.
     *
     * Existing installation, reporting-window, query-window, telemetry and
     * evidence objects are preserved. The source records remain untouched.
     */
    const output = {
        ...siteResult,

        phase:
            SOLAR_PRODUCTION_POWER_PHASE,

        analytics: {
            ...(
                siteResult.analytics ??
                {}
            ),

            power: {
                integrationStatus:
                    SOLAR_PRODUCTION_POWER_INTEGRATION_STATUS
                        .INTEGRATED,

                phase:
                    SOLAR_PRODUCTION_POWER_PHASE,

                reason:
                    SOLAR_PRODUCTION_POWER_REASON
                        .INTEGRATION_COMPLETE,

                value:
                    solarPower,

                diagnostics:
                    buildProductionSolarPowerDiagnostics({
                        records,
                        solarPower,
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
             * H-C executed the validated power integration.
             */
            solarPowerIntegrated:
                true,

            solarPowerCalculated:
                solarPower
                    ?.status ===
                    SOLAR_POWER_ANALYTICS_STATUS
                        .CALCULATED ||
                solarPower
                    ?.status ===
                    SOLAR_POWER_ANALYTICS_STATUS
                        .PARTIALLY_CALCULATED,

            /*
             * Explicitly preserve all downstream phase boundaries.
             */
            energyCalculated:
                false,

            yieldIntegrated:
                false,

            operatingStateCalculated:
                false,

            performanceCalculated:
                false,

            availabilityCalculated:
                false,

            /*
             * Semantic safety boundaries.
             */
            missingMeansZero:
                false,

            zeroMeansFailure:
                false,

            zeroMeansUnavailable:
                false,

            chargerOutputSubstituted:
                false,

            flowContextUsedAsGeneration:
                false,

            settingsContextUsedAsGeneration:
                false,

            primaryAndSecondarySummed:
                false,

            multipleDevicesAutomaticallyAggregated:
                false,

            unitInferred:
                false,

            installedCapacityInferred:
                false,
        },
    };

    return output;
}


/*
|--------------------------------------------------------------------------
| Availability helpers
|--------------------------------------------------------------------------
|
| "Integrated" and "engineering value available" are different concepts.
|--------------------------------------------------------------------------
*/

export function isProductionSolarPowerAvailable(
    result
) {
    const status =
        result
            ?.analytics
            ?.power
            ?.value
            ?.status;

    return (
        status ===
            SOLAR_POWER_ANALYTICS_STATUS
                .CALCULATED ||
        status ===
            SOLAR_POWER_ANALYTICS_STATUS
                .PARTIALLY_CALCULATED
    );
}


export function isProductionSolarPowerUnavailable(
    result
) {
    return (
        result
            ?.analytics
            ?.power
            ?.value
            ?.status ===
        SOLAR_POWER_ANALYTICS_STATUS
            .UNAVAILABLE
    );
}


/*
|--------------------------------------------------------------------------
| Semantic boundary audit
|--------------------------------------------------------------------------
*/

export function auditProductionSolarPowerBoundaries(
    result
) {
    return {
        integrationExecuted:
            result
                ?.analytics
                ?.power
                ?.integrationStatus ===
            SOLAR_PRODUCTION_POWER_INTEGRATION_STATUS
                .INTEGRATED,

        phaseAdvancedToHC:
            result
                ?.phase ===
            SOLAR_PRODUCTION_POWER_PHASE,

        reportingWindowSemanticsPreserved:
            result
                ?.reportingWindow
                ?.semantics ===
            "[start,end)",

        missingNotZero:
            result
                ?.boundaries
                ?.missingMeansZero ===
            false,

        zeroNotFailure:
            result
                ?.boundaries
                ?.zeroMeansFailure ===
            false,

        zeroNotUnavailable:
            result
                ?.boundaries
                ?.zeroMeansUnavailable ===
            false,

        attr107NotSubstituted:
            result
                ?.boundaries
                ?.chargerOutputSubstituted ===
            false,

        flowContextNotGeneration:
            result
                ?.boundaries
                ?.flowContextUsedAsGeneration ===
            false,

        settingsContextNotGeneration:
            result
                ?.boundaries
                ?.settingsContextUsedAsGeneration ===
            false,

        primarySecondaryNotSummed:
            result
                ?.boundaries
                ?.primaryAndSecondarySummed ===
            false,

        multiDeviceNotAutomaticallyAggregated:
            result
                ?.boundaries
                ?.multipleDevicesAutomaticallyAggregated ===
            false,

        unitNotInferred:
            result
                ?.boundaries
                ?.unitInferred ===
            false,

        installedCapacityNotInferred:
            result
                ?.boundaries
                ?.installedCapacityInferred ===
            false,

        energyStillReserved:
            result
                ?.boundaries
                ?.energyCalculated ===
            false &&
            result
                ?.boundaries
                ?.yieldIntegrated ===
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
    SOLAR_PRODUCTION_POWER_PHASE,
    SOLAR_PRODUCTION_POWER_INTEGRATION_STATUS,
    SOLAR_PRODUCTION_POWER_REASON,

    validateProductionSolarSiteShell,
    buildProductionSolarPowerDiagnostics,
    calculateProductionSolarPower,
    integrateProductionSolarPower,
    isProductionSolarPowerAvailable,
    isProductionSolarPowerUnavailable,
    auditProductionSolarPowerBoundaries,
});
