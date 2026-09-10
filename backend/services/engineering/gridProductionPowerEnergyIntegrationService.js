// services/engineering/gridProductionPowerEnergyIntegrationService.js

import {
    GRID_POWER_ANALYTICS_STATUS,
    calculateGridPowerAnalytics,
} from "./gridPowerAnalyticsService.js";

import {
    GRID_ENERGY_ANALYTICS_STATUS,
    calculateGridEnergyAnalytics,
} from "./gridEnergyAnalyticsService.js";


/*
|--------------------------------------------------------------------------
| Phase 8.6H-D
| Production Grid Power + Energy Integration
|--------------------------------------------------------------------------
|
| PURPOSE
|
| Integrate the already-validated:
|
| - Phase 8.6D-D grid power analytics engine
| - Phase 8.6E   grid energy analytics engine
|
| into the Phase 8.6H production grid adapter pipeline.
|
| Input requirement:
|
| - canonical H-C production grid site result
| - H-A production telemetry records preserved inside that result
| - H-C source-state result preserved inside:
|
|       analytics.sourceState.value
|
| - source-state intervals preserved inside:
|
|       analytics.sourceState.value.intervals
|
| This service DOES NOT:
|
| - recalculate source-state semantics
| - infer W/kW from magnitude
| - infer grid import/export direction
| - substitute generic VRM "kwh"
| - substitute served-load energy
| - interpret zero power as outage
| - infer customer interruption
| - mutate Phase 7 events
|--------------------------------------------------------------------------
*/


export const GRID_PRODUCTION_POWER_ENERGY_PHASE =
    "8.6H-D";


export const GRID_PRODUCTION_POWER_ENERGY_INTEGRATION_STATUS =
    Object.freeze({
        INTEGRATED:
            "INTEGRATED",
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


function cloneProductionGridResult(
    siteResult
) {
    return {
        ...siteResult,

        installation: {
            ...siteResult.installation,
        },

        reportingWindow: {
            ...siteResult.reportingWindow,
        },

        queryWindow: {
            ...siteResult.queryWindow,
        },

        evidence: {
            ...siteResult.evidence,

            diagnostics: {
                ...siteResult
                    .evidence
                    ?.diagnostics,
            },
        },

        analytics: {
            ...siteResult.analytics,

            sourceState: {
                ...siteResult
                    .analytics
                    ?.sourceState,
            },
        },

        boundaries: {
            ...siteResult.boundaries,
        },
    };
}


/*
|--------------------------------------------------------------------------
| H-C input validation
|--------------------------------------------------------------------------
*/

export function validateProductionGridPowerEnergyInput(
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
                "PRODUCTION_GRID_SITE_RESULT_REQUIRED",
        };
    }


    if (
        siteResult.family !==
        "GRID"
    ) {
        return {
            valid:
                false,

            reason:
                "INVALID_GRID_FAMILY",
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
                "INVALID_PRODUCTION_LAYER",
        };
    }


    if (
        siteResult.phase !==
        "8.6H-C"
    ) {
        return {
            valid:
                false,

            reason:
                "PHASE_8_6H_C_REQUIRED",
        };
    }


    if (
        !siteResult.installation
            ?.id ||
        !siteResult.installation
            ?.vrmSiteId
    ) {
        return {
            valid:
                false,

            reason:
                "INSTALLATION_IDENTITY_REQUIRED",
        };
    }


    const reportingStart =
        asDate(
            siteResult
                ?.reportingWindow
                ?.start
        );


    const reportingEnd =
        asDate(
            siteResult
                ?.reportingWindow
                ?.end
        );


    if (
        !reportingStart ||
        !reportingEnd ||
        reportingStart >=
            reportingEnd
    ) {
        return {
            valid:
                false,

            reason:
                "VALID_REPORTING_WINDOW_REQUIRED",
        };
    }


    if (
        siteResult
            .reportingWindow
            .semantics !==
        "[start,end)"
    ) {
        return {
            valid:
                false,

            reason:
                "INVALID_REPORTING_WINDOW_SEMANTICS",
        };
    }


    if (
        !Array.isArray(
            siteResult
                ?.evidence
                ?.records
        )
    ) {
        return {
            valid:
                false,

            reason:
                "PRODUCTION_TELEMETRY_RECORDS_REQUIRED",
        };
    }


    const sourceState =
        siteResult
            ?.analytics
            ?.sourceState
            ?.value;


    if (
        !sourceState ||
        typeof sourceState !==
            "object"
    ) {
        return {
            valid:
                false,

            reason:
                "SOURCE_STATE_RESULT_REQUIRED",
        };
    }


    if (
        sourceState.family !==
        "GRID_SOURCE_STATE"
    ) {
        return {
            valid:
                false,

            reason:
                "INVALID_SOURCE_STATE_FAMILY",
        };
    }


    if (
        !Array.isArray(
            sourceState.intervals
        )
    ) {
        return {
            valid:
                false,

            reason:
                "SOURCE_STATE_INTERVALS_REQUIRED",
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
| Canonical evidence extraction
|--------------------------------------------------------------------------
*/

export function getProductionGridPowerEnergyEvidence(
    siteResult
) {
    const validation =
        validateProductionGridPowerEnergyInput(
            siteResult
        );


    if (
        validation.valid !==
        true
    ) {
        throw new Error(
            `Invalid H-C production grid result: ${validation.reason}`
        );
    }


    return {
        records:
            siteResult
                .evidence
                .records,

        sourceState:
            siteResult
                .analytics
                .sourceState
                .value,

        sourceStateIntervals:
            siteResult
                .analytics
                .sourceState
                .value
                .intervals,

        start:
            siteResult
                .reportingWindow
                .start,

        end:
            siteResult
                .reportingWindow
                .end,
    };
}


/*
|--------------------------------------------------------------------------
| Power analytics integration
|--------------------------------------------------------------------------
*/

export function calculateProductionGridPower({
    siteResult,

    config = {},

    powerCalculator =
        calculateGridPowerAnalytics,
} = {}) {
    if (
        typeof powerCalculator !==
        "function"
    ) {
        throw new Error(
            "powerCalculator must be a function."
        );
    }


    const evidence =
        getProductionGridPowerEnergyEvidence(
            siteResult
        );


    return powerCalculator({
        records:
            evidence.records,

        sourceStateIntervals:
            evidence.sourceStateIntervals,

        config,
    });
}


/*
|--------------------------------------------------------------------------
| Energy analytics integration
|--------------------------------------------------------------------------
|
| The Phase 8.6E service internally invokes calculateGridPowerAnalytics().
|
| Therefore H-D passes the SAME power config into energy.config.gridPowerConfig
| so the independently exposed power result and the power result embedded
| inside the energy calculation use the same qualification policy.
|--------------------------------------------------------------------------
*/

export function calculateProductionGridEnergy({
    siteResult,

    powerConfig = {},

    energyConfig = {},

    energyCalculator =
        calculateGridEnergyAnalytics,
} = {}) {
    if (
        typeof energyCalculator !==
        "function"
    ) {
        throw new Error(
            "energyCalculator must be a function."
        );
    }


    const evidence =
        getProductionGridPowerEnergyEvidence(
            siteResult
        );


    return energyCalculator({
        records:
            evidence.records,

        sourceStateIntervals:
            evidence.sourceStateIntervals,

        start:
            evidence.start,

        end:
            evidence.end,

        config: {
            ...energyConfig,

            /*
             * Enforce the same canonical power configuration used by the
             * separately exposed H-D power calculation.
             */
            gridPowerConfig:
                powerConfig,
        },
    });
}


/*
|--------------------------------------------------------------------------
| Diagnostics
|--------------------------------------------------------------------------
*/

export function buildProductionGridPowerEnergyDiagnostics({
    siteResult,

    gridPower,

    gridEnergy,

    powerConfig = {},

    energyConfig = {},
} = {}) {
    const records =
        siteResult
            ?.evidence
            ?.records;


    const sourceState =
        siteResult
            ?.analytics
            ?.sourceState
            ?.value;


    const sourceStateIntervals =
        sourceState
            ?.intervals;


    return {
        productionRecordCount:
            Array.isArray(
                records
            )
                ? records.length
                : 0,

        sourceStateStatus:
            sourceState
                ?.status ??
            null,

        sourceStateReason:
            sourceState
                ?.reason ??
            null,

        sourceStateIntervalCount:
            Array.isArray(
                sourceStateIntervals
            )
                ? sourceStateIntervals.length
                : 0,

        gridPowerStatus:
            gridPower
                ?.status ??
            null,

        gridPowerReason:
            gridPower
                ?.reason ??
            null,

        gridPowerSource:
            gridPower
                ?.source ??
            null,

        gridPowerUnit:
            gridPower
                ?.power
                ?.unit ??
            null,

        gridPowerSampleCount:
            Array.isArray(
                gridPower
                    ?.power
                    ?.samples
            )
                ? gridPower
                    .power
                    .samples
                    .length
                : 0,

        gridEnergyStatus:
            gridEnergy
                ?.status ??
            null,

        gridEnergyReason:
            gridEnergy
                ?.reason ??
            null,

        signedEnergyKWh:
            gridEnergy
                ?.energy
                ?.signedEnergyKWh ??
            gridEnergy
                ?.metrics
                ?.signedEnergyKWh ??
            null,

        powerConfig:
            {
                ...powerConfig,
            },

        energyConfig:
            {
                ...energyConfig,
            },
    };
}


/*
|--------------------------------------------------------------------------
| Main H-D integration
|--------------------------------------------------------------------------
*/

export function integrateProductionGridPowerEnergy({
    siteResult,

    powerConfig = {},

    energyConfig = {},

    powerCalculator =
        calculateGridPowerAnalytics,

    energyCalculator =
        calculateGridEnergyAnalytics,
} = {}) {
    const validation =
        validateProductionGridPowerEnergyInput(
            siteResult
        );


    if (
        validation.valid !==
        true
    ) {
        throw new Error(
            `Invalid H-C production grid result: ${validation.reason}`
        );
    }


    const gridPower =
        calculateProductionGridPower({
            siteResult,

            config:
                powerConfig,

            powerCalculator,
        });


    const gridEnergy =
        calculateProductionGridEnergy({
            siteResult,

            powerConfig,

            energyConfig,

            energyCalculator,
        });


    const output =
        cloneProductionGridResult(
            siteResult
        );


    output.phase =
        GRID_PRODUCTION_POWER_ENERGY_PHASE;


    output.analytics.power =
        {
            status:
                GRID_PRODUCTION_POWER_ENERGY_INTEGRATION_STATUS
                    .INTEGRATED,

            phase:
                GRID_PRODUCTION_POWER_ENERGY_PHASE,

            reason:
                gridPower
                    ?.reason ??
                null,

            value:
                gridPower,
        };


    output.analytics.energy =
        {
            status:
                GRID_PRODUCTION_POWER_ENERGY_INTEGRATION_STATUS
                    .INTEGRATED,

            phase:
                GRID_PRODUCTION_POWER_ENERGY_PHASE,

            reason:
                gridEnergy
                    ?.reason ??
                null,

            value:
                gridEnergy,
        };


    output.evidence.powerEnergyDiagnostics =
        buildProductionGridPowerEnergyDiagnostics({
            siteResult,

            gridPower,

            gridEnergy,

            powerConfig,

            energyConfig,
        });


    /*
    |--------------------------------------------------------------------------
    | H-D boundaries
    |--------------------------------------------------------------------------
    */

    output.boundaries
        .sourceStateCalculated =
        true;

    output.boundaries
        .gridPowerCalculated =
        true;

    output.boundaries
        .gridEnergyCalculated =
        true;


    /*
     * Later integration stages remain untouched.
     */

    output.boundaries
        .interruptionsIntegrated =
        false;

    output.boundaries
        .gridQualityCalculated =
        false;


    /*
     * Reliability boundaries remain immutable.
     */

    output.boundaries
        .phase7EventsModified =
        false;

    output.boundaries
        .customerInterruptionEstablished =
        false;

    output.boundaries
        .saidiSaifiEligibilityChanged =
        false;

    output.boundaries
        .ensEligibilityChanged =
        false;


    /*
     * Semantic protections.
     */

    output.boundaries
        .missingMeansZero =
        false;

    output.boundaries
        .unitInferenceAllowed =
        false;

    output.boundaries
        .directionInferenceAllowed =
        false;

    output.boundaries
        .importExportEstablished =
        false;


    return output;
}


/*
|--------------------------------------------------------------------------
| Result helpers
|--------------------------------------------------------------------------
*/

export function isProductionGridPowerAvailable(
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
            GRID_POWER_ANALYTICS_STATUS
                .CALCULATED ||
        status ===
            GRID_POWER_ANALYTICS_STATUS
                .PARTIALLY_CALCULATED
    );
}


export function isProductionGridEnergyAvailable(
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
            GRID_ENERGY_ANALYTICS_STATUS
                .CALCULATED ||
        status ===
            GRID_ENERGY_ANALYTICS_STATUS
                .PARTIALLY_CALCULATED
    );
}


/*
|--------------------------------------------------------------------------
| Semantic boundary audit
|--------------------------------------------------------------------------
*/

export function auditProductionGridPowerEnergyBoundaries(
    result
) {
    return {
        sourceStatePreserved:
            result
                ?.boundaries
                ?.sourceStateCalculated ===
            true,

        powerIntegrated:
            result
                ?.boundaries
                ?.gridPowerCalculated ===
            true,

        energyIntegrated:
            result
                ?.boundaries
                ?.gridEnergyCalculated ===
            true,

        interruptionsStillUnevaluated:
            result
                ?.boundaries
                ?.interruptionsIntegrated ===
            false,

        qualityStillUnevaluated:
            result
                ?.boundaries
                ?.gridQualityCalculated ===
            false,

        phase7Immutable:
            result
                ?.boundaries
                ?.phase7EventsModified ===
            false,

        customerInterruptionNotInferred:
            result
                ?.boundaries
                ?.customerInterruptionEstablished ===
            false,

        saidiSaifiEligibilityUnchanged:
            result
                ?.boundaries
                ?.saidiSaifiEligibilityChanged ===
            false,

        ensEligibilityUnchanged:
            result
                ?.boundaries
                ?.ensEligibilityChanged ===
            false,

        missingNotZero:
            result
                ?.boundaries
                ?.missingMeansZero ===
            false,

        unitInferenceBlocked:
            result
                ?.boundaries
                ?.unitInferenceAllowed ===
            false,

        directionInferenceBlocked:
            result
                ?.boundaries
                ?.directionInferenceAllowed ===
            false,

        importExportNotEstablished:
            result
                ?.boundaries
                ?.importExportEstablished ===
            false,
    };
}


export default {
    GRID_PRODUCTION_POWER_ENERGY_PHASE,
    GRID_PRODUCTION_POWER_ENERGY_INTEGRATION_STATUS,

    validateProductionGridPowerEnergyInput,
    getProductionGridPowerEnergyEvidence,
    calculateProductionGridPower,
    calculateProductionGridEnergy,
    buildProductionGridPowerEnergyDiagnostics,
    integrateProductionGridPowerEnergy,
    isProductionGridPowerAvailable,
    isProductionGridEnergyAvailable,
    auditProductionGridPowerEnergyBoundaries,
};