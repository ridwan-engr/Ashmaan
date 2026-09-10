// services/engineering/solarProductionPerformanceAvailabilityIntegrationService.js

import {
    calculateSolarPerformanceAnalytics,
} from "./solarPerformanceAnalyticsService.js";

import {
    calculateSolarAvailability,
} from "./solarAvailabilityService.js";


/*
|--------------------------------------------------------------------------
| ASHMAAN
| Phase 8.7H-F — Production Solar Performance + Availability Integration
|--------------------------------------------------------------------------
|
| Production integration layer only.
|
| This service does NOT redefine the validated Phase 8.7F engineering
| equations or semantics. It delegates the complete canonical production
| telemetry array to:
|
|   calculateSolarPerformanceAnalytics()
|   calculateSolarAvailability()
|
| while preserving the H-C power, H-D energy/yield and H-E operating-state
| result objects exactly.
|--------------------------------------------------------------------------
*/


export const SOLAR_PRODUCTION_PERFORMANCE_AVAILABILITY_PHASE =
    "8.7H-F";


export const SOLAR_PRODUCTION_PERFORMANCE_AVAILABILITY_INTEGRATION_STATUS =
    Object.freeze({
        INTEGRATED:
            "INTEGRATED",

        NOT_INTEGRATED:
            "NOT_INTEGRATED",
    });


export const SOLAR_PRODUCTION_PERFORMANCE_AVAILABILITY_REASON =
    Object.freeze({
        INTEGRATION_COMPLETE:
            "INTEGRATION_COMPLETE",

        PRODUCTION_SOLAR_SITE_RESULT_REQUIRED:
            "PRODUCTION_SOLAR_SITE_RESULT_REQUIRED",

        INVALID_SOLAR_FAMILY:
            "INVALID_SOLAR_FAMILY",

        INVALID_PRODUCTION_LAYER:
            "INVALID_PRODUCTION_LAYER",

        INVALID_H_E_PHASE:
            "INVALID_H_E_PHASE",

        POWER_INTEGRATION_REQUIRED:
            "POWER_INTEGRATION_REQUIRED",

        ENERGY_INTEGRATION_REQUIRED:
            "ENERGY_INTEGRATION_REQUIRED",

        OPERATING_STATE_INTEGRATION_REQUIRED:
            "OPERATING_STATE_INTEGRATION_REQUIRED",

        INVALID_REPORTING_WINDOW:
            "INVALID_REPORTING_WINDOW",

        INVALID_REPORTING_WINDOW_SEMANTICS:
            "INVALID_REPORTING_WINDOW_SEMANTICS",

        PRODUCTION_EVIDENCE_REQUIRED:
            "PRODUCTION_EVIDENCE_REQUIRED",

        PRODUCTION_RECORDS_REQUIRED:
            "PRODUCTION_RECORDS_REQUIRED",
    });


function validDate(
    value
) {
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


function statusIndicatesCalculated(
    result
) {
    return (
        result?.status ===
            "CALCULATED" ||
        result?.status ===
            "PARTIALLY_CALCULATED"
    );
}


function statusIndicatesUnavailable(
    result
) {
    return (
        result?.status ===
        "UNAVAILABLE"
    );
}


/*
|--------------------------------------------------------------------------
| Input validation
|--------------------------------------------------------------------------
*/

export function validateProductionSolarPerformanceAvailabilityInput(
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
                SOLAR_PRODUCTION_PERFORMANCE_AVAILABILITY_REASON
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
                SOLAR_PRODUCTION_PERFORMANCE_AVAILABILITY_REASON
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
                SOLAR_PRODUCTION_PERFORMANCE_AVAILABILITY_REASON
                    .INVALID_PRODUCTION_LAYER,
        };
    }


    if (
        siteResult.phase !==
        "8.7H-E"
    ) {
        return {
            valid:
                false,

            reason:
                SOLAR_PRODUCTION_PERFORMANCE_AVAILABILITY_REASON
                    .INVALID_H_E_PHASE,
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
                SOLAR_PRODUCTION_PERFORMANCE_AVAILABILITY_REASON
                    .POWER_INTEGRATION_REQUIRED,
        };
    }


    if (
        siteResult
            ?.analytics
            ?.energy
            ?.integrationStatus !==
        "INTEGRATED"
    ) {
        return {
            valid:
                false,

            reason:
                SOLAR_PRODUCTION_PERFORMANCE_AVAILABILITY_REASON
                    .ENERGY_INTEGRATION_REQUIRED,
        };
    }


    if (
        siteResult
            ?.analytics
            ?.operatingState
            ?.integrationStatus !==
        "INTEGRATED"
    ) {
        return {
            valid:
                false,

            reason:
                SOLAR_PRODUCTION_PERFORMANCE_AVAILABILITY_REASON
                    .OPERATING_STATE_INTEGRATION_REQUIRED,
        };
    }


    const start =
        validDate(
            siteResult
                ?.reportingWindow
                ?.start
        );


    const end =
        validDate(
            siteResult
                ?.reportingWindow
                ?.end
        );


    if (
        !start ||
        !end ||
        end <=
            start
    ) {
        return {
            valid:
                false,

            reason:
                SOLAR_PRODUCTION_PERFORMANCE_AVAILABILITY_REASON
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
                SOLAR_PRODUCTION_PERFORMANCE_AVAILABILITY_REASON
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
                SOLAR_PRODUCTION_PERFORMANCE_AVAILABILITY_REASON
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
                SOLAR_PRODUCTION_PERFORMANCE_AVAILABILITY_REASON
                    .PRODUCTION_RECORDS_REQUIRED,
        };
    }


    return {
        valid:
            true,

        reason:
            null,
    };
}


/*
|--------------------------------------------------------------------------
| Calculator delegation
|--------------------------------------------------------------------------
*/

export function calculateProductionSolarPerformance({
    records = [],
    start,
    end,
    selectedDeviceInstance =
        null,
    config = {},
    solarPerformanceCalculator =
        calculateSolarPerformanceAnalytics,
} = {}) {
    if (
        typeof solarPerformanceCalculator !==
        "function"
    ) {
        throw new Error(
            "solarPerformanceCalculator must be a function."
        );
    }


    return solarPerformanceCalculator({
        records,
        start,
        end,
        selectedDeviceInstance,
        config,
    });
}


export function calculateProductionSolarAvailability({
    records = [],
    start,
    end,
    selectedDeviceInstance =
        null,
    config = {},
    solarAvailabilityCalculator =
        calculateSolarAvailability,
} = {}) {
    if (
        typeof solarAvailabilityCalculator !==
        "function"
    ) {
        throw new Error(
            "solarAvailabilityCalculator must be a function."
        );
    }


    return solarAvailabilityCalculator({
        records,
        start,
        end,
        selectedDeviceInstance,
        config,
    });
}


/*
|--------------------------------------------------------------------------
| Diagnostics
|--------------------------------------------------------------------------
*/

export function buildProductionSolarPerformanceAvailabilityDiagnostics({
    records = [],
    performance = null,
    availability = null,
    selectedDeviceInstance =
        null,
    performanceConfig = {},
    availabilityConfig = {},
} = {}) {
    return {
        recordCount:
            Array.isArray(
                records
            )
                ? records.length
                : 0,

        selectedDeviceInstance,

        performance: {
            status:
                performance
                    ?.status ??
                null,

            reason:
                performance
                    ?.reason ??
                null,

            calculated:
                statusIndicatesCalculated(
                    performance
                ),

            unavailable:
                statusIndicatesUnavailable(
                    performance
                ),
        },

        availability: {
            status:
                availability
                    ?.status ??
                null,

            reason:
                availability
                    ?.reason ??
                null,

            calculated:
                statusIndicatesCalculated(
                    availability
                ),

            unavailable:
                statusIndicatesUnavailable(
                    availability
                ),
        },

        configs: {
            performanceConfigProvided:
                performanceConfig !==
                    null &&
                typeof performanceConfig ===
                    "object",

            availabilityConfigProvided:
                availabilityConfig !==
                    null &&
                typeof availabilityConfig ===
                    "object",
        },

        boundaries: {
            completeProductionTelemetryDelegated:
                true,

            installedCapacityInferred:
                false,

            irradianceInferred:
                false,

            zeroPowerMeansFailure:
                false,

            zeroPowerMeansUnavailable:
                false,

            modeOnEstablishesAvailability:
                false,

            errorCodeZeroEstablishesAvailability:
                false,

            mpptStateEstablishesIrradiance:
                false,

            multipleSolarChargersAutomaticallyAggregated:
                false,
        },
    };
}


/*
|--------------------------------------------------------------------------
| Canonical H-F integration
|--------------------------------------------------------------------------
*/

export function integrateProductionSolarPerformanceAvailability({
    siteResult,
    selectedDeviceInstance =
        null,
    performanceConfig = {},
    availabilityConfig = {},
    solarPerformanceCalculator =
        calculateSolarPerformanceAnalytics,
    solarAvailabilityCalculator =
        calculateSolarAvailability,
} = {}) {
    const validation =
        validateProductionSolarPerformanceAvailabilityInput(
            siteResult
        );


    if (
        validation.valid !==
        true
    ) {
        throw new Error(
            `Invalid H-E production Solar result: ${validation.reason}`
        );
    }


    const records =
        siteResult
            .evidence
            .records;


    const start =
        siteResult
            .reportingWindow
            .start;


    const end =
        siteResult
            .reportingWindow
            .end;


    const performance =
        calculateProductionSolarPerformance({
            records,
            start,
            end,
            selectedDeviceInstance,
            config:
                performanceConfig,
            solarPerformanceCalculator,
        });


    const availability =
        calculateProductionSolarAvailability({
            records,
            start,
            end,
            selectedDeviceInstance,
            config:
                availabilityConfig,
            solarAvailabilityCalculator,
        });


    return {
        ...siteResult,

        phase:
            SOLAR_PRODUCTION_PERFORMANCE_AVAILABILITY_PHASE,

        analytics: {
            ...(
                siteResult.analytics ??
                {}
            ),

            performance: {
                integrationStatus:
                    SOLAR_PRODUCTION_PERFORMANCE_AVAILABILITY_INTEGRATION_STATUS
                        .INTEGRATED,

                phase:
                    SOLAR_PRODUCTION_PERFORMANCE_AVAILABILITY_PHASE,

                reason:
                    SOLAR_PRODUCTION_PERFORMANCE_AVAILABILITY_REASON
                        .INTEGRATION_COMPLETE,

                value:
                    performance,
            },

            availability: {
                integrationStatus:
                    SOLAR_PRODUCTION_PERFORMANCE_AVAILABILITY_INTEGRATION_STATUS
                        .INTEGRATED,

                phase:
                    SOLAR_PRODUCTION_PERFORMANCE_AVAILABILITY_PHASE,

                reason:
                    SOLAR_PRODUCTION_PERFORMANCE_AVAILABILITY_REASON
                        .INTEGRATION_COMPLETE,

                value:
                    availability,
            },

            performanceAvailabilityDiagnostics:
                buildProductionSolarPerformanceAvailabilityDiagnostics({
                    records,
                    performance,
                    availability,
                    selectedDeviceInstance,
                    performanceConfig,
                    availabilityConfig,
                }),
        },

        boundaries: {
            ...(
                siteResult.boundaries ??
                {}
            ),

            solarPerformanceIntegrated:
                true,

            solarAvailabilityIntegrated:
                true,

            performanceCalculated:
                statusIndicatesCalculated(
                    performance
                ),

            availabilityCalculated:
                statusIndicatesCalculated(
                    availability
                ),

            installedCapacityInferred:
                false,

            irradianceInferred:
                false,

            performanceRatioFabricated:
                false,

            capacityFactorFabricated:
                false,

            availabilityFabricated:
                false,

            zeroPowerMeansFailure:
                false,

            zeroPowerMeansUnavailable:
                false,

            modeOnEstablishesAvailability:
                false,

            errorCodeZeroEstablishesAvailability:
                false,

            mpptStateEstablishesIrradiance:
                false,

            offReasonAutomaticallyAttributesDowntime:
                false,

            numericStateCodeAutomaticallyNamed:
                false,

            multipleSolarChargersAutomaticallyAggregated:
                false,

            missingTelemetryMeansZero:
                false,

            missingTelemetryMeansNoSolarInstallation:
                false,

            performanceOverridesPowerEvidence:
                false,

            performanceOverridesEnergyEvidence:
                false,

            availabilityOverridesOperatingStateEvidence:
                false,

            productionAdapterValidated:
                false,
        },
    };
}


/*
|--------------------------------------------------------------------------
| Helpers / audit
|--------------------------------------------------------------------------
*/

export function isProductionSolarPerformanceAvailable(
    result
) {
    return statusIndicatesCalculated(
        result
            ?.analytics
            ?.performance
            ?.value
    );
}


export function isProductionSolarAvailabilityAvailable(
    result
) {
    return statusIndicatesCalculated(
        result
            ?.analytics
            ?.availability
            ?.value
    );
}


export function auditProductionSolarPerformanceAvailabilityBoundaries(
    result
) {
    return {
        phaseCorrect:
            result?.phase ===
            SOLAR_PRODUCTION_PERFORMANCE_AVAILABILITY_PHASE,

        performanceIntegrated:
            result
                ?.analytics
                ?.performance
                ?.integrationStatus ===
            SOLAR_PRODUCTION_PERFORMANCE_AVAILABILITY_INTEGRATION_STATUS
                .INTEGRATED,

        availabilityIntegrated:
            result
                ?.analytics
                ?.availability
                ?.integrationStatus ===
            SOLAR_PRODUCTION_PERFORMANCE_AVAILABILITY_INTEGRATION_STATUS
                .INTEGRATED,

        upstreamPowerPreserved:
            Boolean(
                result
                    ?.analytics
                    ?.power
            ),

        upstreamEnergyPreserved:
            Boolean(
                result
                    ?.analytics
                    ?.energy
            ),

        upstreamOperatingStatePreserved:
            Boolean(
                result
                    ?.analytics
                    ?.operatingState
            ),

        installedCapacityNotInferred:
            result
                ?.boundaries
                ?.installedCapacityInferred ===
            false,

        irradianceNotInferred:
            result
                ?.boundaries
                ?.irradianceInferred ===
            false,

        zeroPowerNotFailure:
            result
                ?.boundaries
                ?.zeroPowerMeansFailure ===
            false,

        zeroPowerNotUnavailable:
            result
                ?.boundaries
                ?.zeroPowerMeansUnavailable ===
            false,

        chargerModeNotAvailability:
            result
                ?.boundaries
                ?.modeOnEstablishesAvailability ===
            false,

        errorCodeZeroNotAvailability:
            result
                ?.boundaries
                ?.errorCodeZeroEstablishesAvailability ===
            false,

        mpptNotIrradiance:
            result
                ?.boundaries
                ?.mpptStateEstablishesIrradiance ===
            false,

        multiChargerNotAutomaticallyAggregated:
            result
                ?.boundaries
                ?.multipleSolarChargersAutomaticallyAggregated ===
            false,

        hGReserved:
            result
                ?.boundaries
                ?.productionAdapterValidated ===
            false,
    };
}


export default Object.freeze({
    SOLAR_PRODUCTION_PERFORMANCE_AVAILABILITY_PHASE,
    SOLAR_PRODUCTION_PERFORMANCE_AVAILABILITY_INTEGRATION_STATUS,
    SOLAR_PRODUCTION_PERFORMANCE_AVAILABILITY_REASON,
    validateProductionSolarPerformanceAvailabilityInput,
    calculateProductionSolarPerformance,
    calculateProductionSolarAvailability,
    buildProductionSolarPerformanceAvailabilityDiagnostics,
    integrateProductionSolarPerformanceAvailability,
    isProductionSolarPerformanceAvailable,
    isProductionSolarAvailabilityAvailable,
    auditProductionSolarPerformanceAvailabilityBoundaries,
});
