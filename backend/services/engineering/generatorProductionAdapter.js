// services/engineering/generatorProductionAdapter.js

import {
    normalizeGeneratorProductionTelemetry,
    removeAmbiguousTelemetryDuplicates,
    selectGeneratorProductionPowerTopology,
    qualifyGeneratorProductionPowerUnit,
    GENERATOR_PRODUCTION_TOPOLOGY_STATUS,
} from "./generatorProductionAdapterSupport.js";


import {
    qualifyGeneratorProductionEnergyIntervals,
} from "./generatorProductionEnergyIntervalService.js";


import {
    calculateGeneratorRuntime,
} from "./generatorRuntimeService.js";


import {
    calculateGeneratorStartStopAnalytics,
} from "./generatorStartStopService.js";


import {
    calculateGeneratorLoadingAnalytics,
} from "./generatorLoadingService.js";


import {
    calculateGeneratorElectricalEnergy,
} from "./generatorEnergyService.js";


import {
    calculateGeneratorContribution,
} from "./generatorContributionService.js";


import {
    calculateGeneratorFuelAnalytics,
} from "./generatorFuelService.js";


import {
    calculateGeneratorAvailabilityAnalytics,
} from "./generatorAvailabilityService.js";


/*
|--------------------------------------------------------------------------
| Phase 8.5I-C
| Production Generator Analytics Orchestrator
|--------------------------------------------------------------------------
|
| Responsibilities:
|
| 1. Accept production telemetry already retrieved from MongoDB.
| 2. Normalize engineering evidence.
| 3. Remove duplicate/conflicting evidence.
| 4. Resolve generator topology.
| 5. Qualify explicit generator power unit.
| 6. Execute the validated pure engineering engines.
| 7. Build exact generator/served-load contribution intervals.
| 8. Keep unavailable production evidence unavailable.
|
| This service DOES NOT query MongoDB.
|
| Database access belongs in Phase 8.5I-D.
|--------------------------------------------------------------------------
*/


export const GENERATOR_PRODUCTION_ANALYTICS_STATUS =
    Object.freeze({

        CALCULATED:
            "CALCULATED",

        PARTIALLY_CALCULATED:
            "PARTIALLY_CALCULATED",

        UNAVAILABLE:
            "UNAVAILABLE",
    });


export const GENERATOR_PRODUCTION_ANALYTICS_REASON =
    Object.freeze({

        ANALYTICS_QUALIFIED:
            "ANALYTICS_QUALIFIED",

        ANALYTICS_PARTIAL:
            "ANALYTICS_PARTIAL",

        NO_PRODUCTION_TELEMETRY:
            "NO_PRODUCTION_TELEMETRY",

        GENERATOR_POWER_TOPOLOGY_UNAVAILABLE:
            "GENERATOR_POWER_TOPOLOGY_UNAVAILABLE",

        GENERATOR_POWER_TOPOLOGY_AMBIGUOUS:
            "GENERATOR_POWER_TOPOLOGY_AMBIGUOUS",

        GENERATOR_POWER_UNIT_UNRESOLVED:
            "GENERATOR_POWER_UNIT_UNRESOLVED",
    });


export const DEFAULT_GENERATOR_PRODUCTION_ANALYTICS_CONFIG =
    Object.freeze({

        servedLoadFamily:
            "PRIMARY",

        runtime: {},

        startStop: {},

        loading: {},

        energy: {},

        intervals: {},
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


    return Number.isNaN(
        date.getTime()
    )
        ? null
        : date;
}


function validateReportingWindow(
    start,
    end
) {

    const reportingStart =
        asDate(
            start
        );


    const reportingEnd =
        asDate(
            end
        );


    if (
        !reportingStart ||
        !reportingEnd ||
        reportingStart >=
            reportingEnd
    ) {

        throw new Error(
            "A valid [start,end) generator production analytics window is required."
        );
    }


    return {

        start:
            reportingStart,

        end:
            reportingEnd,

        semantics:
            "[start,end)",
    };
}


function normalizeDeviceInstance(
    value
) {

    return String(
        value ??
        "UNKNOWN"
    );
}


/*
|--------------------------------------------------------------------------
| Select one device for one attribute
|--------------------------------------------------------------------------
|
| Used primarily for attr 416 state topology and attr 419 engine-load
| topology.
|
| We keep this independent from generator electrical-power topology.
|
| A generator controller exposing attr 416 does not have to share the same
| deviceInstance as system-level electrical-power telemetry.
|--------------------------------------------------------------------------
*/

function selectAttributeDevice({
    records = [],
    attributeId,
    selectedDeviceInstance = null,
} = {}) {

    const groups =
        new Map();


    for (
        const record
        of records
    ) {

        if (
            Number(
                record?.vrmAttributeId
            ) !==
            Number(
                attributeId
            )
        ) {

            continue;
        }


        const deviceInstance =
            normalizeDeviceInstance(
                record?.deviceInstance
            );


        if (
            !groups.has(
                deviceInstance
            )
        ) {

            groups.set(
                deviceInstance,
                []
            );
        }


        groups
            .get(
                deviceInstance
            )
            .push(
                record
            );
    }


    if (
        selectedDeviceInstance !==
            null &&
        selectedDeviceInstance !==
            undefined
    ) {

        const selected =
            String(
                selectedDeviceInstance
            );


        return {

            status:
                groups.has(
                    selected
                )
                    ? "SELECTED"
                    : "NOT_FOUND",

            deviceInstance:
                groups.has(
                    selected
                )
                    ? selected
                    : null,

            records:
                groups.get(
                    selected
                ) ??
                [],

            deviceInstances:
                Array.from(
                    groups.keys()
                ),
        };
    }


    if (
        groups.size ===
        0
    ) {

        return {

            status:
                "NONE",

            deviceInstance:
                null,

            records:
                [],

            deviceInstances:
                [],
        };
    }


    if (
        groups.size >
        1
    ) {

        return {

            status:
                "AMBIGUOUS",

            deviceInstance:
                null,

            records:
                [],

            deviceInstances:
                Array.from(
                    groups.keys()
                ),
        };
    }


    const [
        [
            deviceInstance,
            selectedRecords,
        ],
    ] =
        Array.from(
            groups.entries()
        );


    return {

        status:
            "SELECTED",

        deviceInstance,

        records:
            selectedRecords,

        deviceInstances: [
            deviceInstance,
        ],
    };
}


/*
|--------------------------------------------------------------------------
| Prepare loading records
|--------------------------------------------------------------------------
|
| generatorLoadingService selects attr 419 device correctly, but its state
| correlation scans attr 416 records supplied to it.
|
| The production adapter therefore explicitly limits state evidence to the
| qualified attr-416 topology before loading analytics is invoked.
|
| This prevents state evidence from a second generator/controller from being
| correlated with an unrelated engine-load device.
|--------------------------------------------------------------------------
*/

function buildProductionLoadingRecords({
    records,
    stateSelection,
    engineLoadSelection,
}) {

    const output =
        [];


    for (
        const record
        of records
    ) {

        const attributeId =
            Number(
                record?.vrmAttributeId
            );


        /*
         * attr 419
         */

        if (
            attributeId ===
            419
        ) {

            if (
                engineLoadSelection.status ===
                    "SELECTED" &&
                normalizeDeviceInstance(
                    record?.deviceInstance
                ) ===
                    engineLoadSelection
                        .deviceInstance
            ) {

                output.push(
                    record
                );
            }


            continue;
        }


        /*
         * attr 416
         */

        if (
            attributeId ===
            416
        ) {

            if (
                stateSelection.status ===
                    "SELECTED" &&
                normalizeDeviceInstance(
                    record?.deviceInstance
                ) ===
                    stateSelection
                        .deviceInstance
            ) {

                output.push(
                    record
                );
            }
        }
    }


    return output;
}


/*
|--------------------------------------------------------------------------
| Determine family-level status
|--------------------------------------------------------------------------
*/

function resolveFamilyStatus(
    analytics
) {

    const statuses =
        [
            analytics.runtime?.status,
            analytics.startStop?.status,
            analytics.loading?.status,
            analytics.energy?.status,
            analytics.contribution?.status,
            analytics.fuel?.status,
            analytics.availability?.status,
        ]
            .filter(
                Boolean
            );


    const calculatedCount =
        statuses.filter(
            (status) =>
                status ===
                "CALCULATED"
        ).length;


    const partialCount =
        statuses.filter(
            (status) =>
                status ===
                "PARTIALLY_CALCULATED"
        ).length;


    if (
        calculatedCount ===
            0 &&
        partialCount ===
            0
    ) {

        return {

            status:
                GENERATOR_PRODUCTION_ANALYTICS_STATUS
                    .UNAVAILABLE,

            reason:
                GENERATOR_PRODUCTION_ANALYTICS_REASON
                    .NO_PRODUCTION_TELEMETRY,
        };
    }


    const allCalculated =
        statuses.length >
            0 &&
        statuses.every(
            (status) =>
                status ===
                "CALCULATED"
        );


    if (
        allCalculated
    ) {

        return {

            status:
                GENERATOR_PRODUCTION_ANALYTICS_STATUS
                    .CALCULATED,

            reason:
                GENERATOR_PRODUCTION_ANALYTICS_REASON
                    .ANALYTICS_QUALIFIED,
        };
    }


    return {

        status:
            GENERATOR_PRODUCTION_ANALYTICS_STATUS
                .PARTIALLY_CALCULATED,

        reason:
            GENERATOR_PRODUCTION_ANALYTICS_REASON
                .ANALYTICS_PARTIAL,
    };
}


/*
|--------------------------------------------------------------------------
| Main production adapter
|--------------------------------------------------------------------------
*/

export function calculateGeneratorProductionAnalytics({
    records = [],

    start,

    end,

    deviceSelection = {},

    servedLoadFamily = "PRIMARY",

    config = {},

    fuelEvidence = {},

    availabilityEvidence = {},
} = {}) {

    const reportingWindow =
        validateReportingWindow(
            start,
            end
        );


    const effectiveConfig = {

        ...DEFAULT_GENERATOR_PRODUCTION_ANALYTICS_CONFIG,

        ...config,

        runtime: {

            ...DEFAULT_GENERATOR_PRODUCTION_ANALYTICS_CONFIG
                .runtime,

            ...(config.runtime ?? {}),
        },

        startStop: {

            ...DEFAULT_GENERATOR_PRODUCTION_ANALYTICS_CONFIG
                .startStop,

            ...(config.startStop ?? {}),
        },

        loading: {

            ...DEFAULT_GENERATOR_PRODUCTION_ANALYTICS_CONFIG
                .loading,

            ...(config.loading ?? {}),
        },

        energy: {

            ...DEFAULT_GENERATOR_PRODUCTION_ANALYTICS_CONFIG
                .energy,

            ...(config.energy ?? {}),
        },

        intervals: {

            ...DEFAULT_GENERATOR_PRODUCTION_ANALYTICS_CONFIG
                .intervals,

            ...(config.intervals ?? {}),
        },
    };


    /*
    |--------------------------------------------------------------------------
    | Step 1
    | Production telemetry normalization
    |--------------------------------------------------------------------------
    */

    const normalization =
        normalizeGeneratorProductionTelemetry(
            records
        );


    /*
    |--------------------------------------------------------------------------
    | Step 2
    | Defensive duplicate/conflict handling
    |--------------------------------------------------------------------------
    */

    const deduplication =
        removeAmbiguousTelemetryDuplicates(
            normalization.records
        );


    const productionRecords =
        deduplication.records;


    /*
    |--------------------------------------------------------------------------
    | Step 3
    | Independent topology qualification
    |--------------------------------------------------------------------------
    |
    | Power, state and engine-load device topology remain independent.
    |--------------------------------------------------------------------------
    */

    const powerTopology =
        selectGeneratorProductionPowerTopology({

            records:
                productionRecords,

            selectedDeviceInstance:
                deviceSelection
                    ?.power ??
                null,
        });


    const stateSelection =
        selectAttributeDevice({

            records:
                productionRecords,

            attributeId:
                416,

            selectedDeviceInstance:
                deviceSelection
                    ?.state ??
                null,
        });


    const engineLoadSelection =
        selectAttributeDevice({

            records:
                productionRecords,

            attributeId:
                419,

            selectedDeviceInstance:
                deviceSelection
                    ?.engineLoad ??
                null,
        });


    /*
    |--------------------------------------------------------------------------
    | Step 4
    | Explicit power-unit qualification
    |--------------------------------------------------------------------------
    */

    const powerUnitQualification =
        powerTopology.status ===
            GENERATOR_PRODUCTION_TOPOLOGY_STATUS
                .QUALIFIED
            ? qualifyGeneratorProductionPowerUnit(
                powerTopology.records
            )
            : {

                status:
                    "UNAVAILABLE",

                powerUnit:
                    "UNRESOLVED",

                reason:
                    powerTopology.reason,
            };


    /*
    |--------------------------------------------------------------------------
    | Step 5
    | Runtime
    |--------------------------------------------------------------------------
    |
    | Runtime topology is not forced to equal electrical-power topology.
    |--------------------------------------------------------------------------
    */

    const runtimeDeviceSelection = {

        ...(deviceSelection
            ?.runtimeCounters ??
            {}),
    };


    if (
        stateSelection.status ===
        "SELECTED"
    ) {

        runtimeDeviceSelection[
            416
        ] =
            stateSelection
                .deviceInstance;
    }


    const runtime =
        calculateGeneratorRuntime({

            records:
                productionRecords,

            start:
                reportingWindow.start,

            end:
                reportingWindow.end,

            deviceSelection:
                runtimeDeviceSelection,

            config:
                effectiveConfig
                    .runtime,
        });


    /*
    |--------------------------------------------------------------------------
    | Step 6
    | Starts / stops
    |--------------------------------------------------------------------------
    */

    const startStop =
        calculateGeneratorStartStopAnalytics({

            records:
                productionRecords,

            start:
                reportingWindow.start,

            end:
                reportingWindow.end,

            selectedDeviceInstance:
                stateSelection.status ===
                    "SELECTED"
                    ? stateSelection
                        .deviceInstance
                    : null,

            config:
                effectiveConfig
                    .startStop,
        });


    /*
    |--------------------------------------------------------------------------
    | Step 7
    | Loading
    |--------------------------------------------------------------------------
    */

    const loadingRecords =
        buildProductionLoadingRecords({

            records:
                productionRecords,

            stateSelection,

            engineLoadSelection,
        });


    const loading =
        calculateGeneratorLoadingAnalytics({

            records:
                loadingRecords,

            start:
                reportingWindow.start,

            end:
                reportingWindow.end,

            selectedDeviceInstance:
                engineLoadSelection.status ===
                    "SELECTED"
                    ? engineLoadSelection
                        .deviceInstance
                    : null,

            config:
                effectiveConfig
                    .loading,
        });


    /*
    |--------------------------------------------------------------------------
    | Step 8
    | Generator electrical energy
    |--------------------------------------------------------------------------
    */

    let energy;


    if (
        powerTopology.status ===
            GENERATOR_PRODUCTION_TOPOLOGY_STATUS
                .QUALIFIED
    ) {

        energy =
            calculateGeneratorElectricalEnergy({

                records:
                    powerTopology.records,

                start:
                    reportingWindow.start,

                end:
                    reportingWindow.end,

                selectedDeviceInstance:
                    powerTopology
                        .deviceInstance,

                powerUnit:
                    powerUnitQualification
                        .powerUnit,

                config:
                    effectiveConfig
                        .energy,
            });
    }


    else {

        /*
         * Reuse pure service to produce a standard unavailable result.
         */

        energy =
            calculateGeneratorElectricalEnergy({

                records:
                    [],

                start:
                    reportingWindow.start,

                end:
                    reportingWindow.end,

                powerUnit:
                    "UNRESOLVED",

                config:
                    effectiveConfig
                        .energy,
            });
    }


    /*
    |--------------------------------------------------------------------------
    | Step 9
    | Exact contribution intervals
    |--------------------------------------------------------------------------
    */

    let productionIntervals;


    if (
        powerTopology.status ===
            GENERATOR_PRODUCTION_TOPOLOGY_STATUS
                .QUALIFIED
    ) {

        productionIntervals =
            qualifyGeneratorProductionEnergyIntervals({

                topology:
                    powerTopology,

                powerUnit:
                    powerUnitQualification
                        .powerUnit,

                servedLoadRecords:
                    productionRecords,

                servedLoadFamily,

                start:
                    reportingWindow.start,

                end:
                    reportingWindow.end,

                config:
                    effectiveConfig
                        .intervals,
            });
    }


    else {

        productionIntervals = {

            family:
                "GENERATOR_PRODUCTION_ENERGY_INTERVALS",

            status:
                "UNAVAILABLE",

            reason:
                powerTopology.reason,

            generatorIntervals:
                [],

            servedLoadIntervals:
                [],
        };
    }


    /*
    |--------------------------------------------------------------------------
    | Step 10
    | Generator contribution
    |--------------------------------------------------------------------------
    */

    const contribution =
        calculateGeneratorContribution({

            generatorIntervals:
                productionIntervals
                    .generatorIntervals ??
                [],

            servedLoadIntervals:
                productionIntervals
                    .servedLoadIntervals ??
                [],
        });


    /*
    |--------------------------------------------------------------------------
    | Step 11
    | Fuel analytics
    |--------------------------------------------------------------------------
    |
    | Current production defaults remain unavailable.
    |
    | No runtime -> fuel conversion.
    | No engine-load -> fuel conversion.
    | No electrical-energy -> invented fuel conversion.
    |--------------------------------------------------------------------------
    */

    const calculatedGeneratorEnergyKWh =
        energy
            ?.metrics
            ?.electricalEnergy
            ?.status ===
            "CALCULATED" ||
        energy
            ?.metrics
            ?.electricalEnergy
            ?.status ===
            "PARTIALLY_CALCULATED"
            ? energy
                ?.metrics
                ?.electricalEnergy
                ?.value
            : null;


    const reportingHours =
        (
            reportingWindow.end -
            reportingWindow.start
        ) /
        3_600_000;


    const fuel =
        calculateGeneratorFuelAnalytics({

            ...fuelEvidence,

            generatorEnergyKWh:
                calculatedGeneratorEnergyKWh,

            reportingHours,
        });


    /*
    |--------------------------------------------------------------------------
    | Step 12
    | Availability / failure analytics
    |--------------------------------------------------------------------------
    |
    | Production defaults:
    |
    | requiredIntervals = []
    | confirmedFailureCount = null
    | exposure = null
    | repairs = null
    | repair downtime = null
    |
    | Therefore availability / lambda / mu remain unavailable until
    | independently qualified evidence exists.
    |--------------------------------------------------------------------------
    */

    const availability =
        calculateGeneratorAvailabilityAnalytics({

            requiredIntervals:
                availabilityEvidence
                    ?.requiredIntervals ??
                [],

            confirmedFailureCount:
                availabilityEvidence
                    ?.confirmedFailureCount ??
                null,

            qualifiedFailureExposureHours:
                availabilityEvidence
                    ?.qualifiedFailureExposureHours ??
                null,

            completedRepairCount:
                availabilityEvidence
                    ?.completedRepairCount ??
                null,

            qualifiedRepairDowntimeHours:
                availabilityEvidence
                    ?.qualifiedRepairDowntimeHours ??
                null,
        });


    /*
    |--------------------------------------------------------------------------
    | Step 13
    | Composite status
    |--------------------------------------------------------------------------
    */

    const analytics = {

        runtime,

        startStop,

        loading,

        energy,

        contribution,

        fuel,

        availability,
    };


    const familyStatus =
        resolveFamilyStatus(
            analytics
        );


    /*
    |--------------------------------------------------------------------------
    | Final production contract
    |--------------------------------------------------------------------------
    */

    return {

        family:
            "GENERATOR_PRODUCTION_ANALYTICS",

        status:
            familyStatus.status,

        reason:
            familyStatus.reason,

        reportingWindow,

        preparation: {

            normalization:
                normalization.evidence,

            deduplication:
                deduplication.evidence,

            powerTopology: {

                status:
                    powerTopology.status,

                reason:
                    powerTopology.reason,

                source:
                    powerTopology.source,

                mode:
                    powerTopology.mode,

                deviceInstance:
                    powerTopology
                        .deviceInstance,

                attributes:
                    powerTopology.attributes,

                evidence:
                    powerTopology.evidence ??
                    null,
            },

            stateTopology: {

                status:
                    stateSelection.status,

                deviceInstance:
                    stateSelection
                        .deviceInstance,

                deviceInstances:
                    stateSelection
                        .deviceInstances,
            },

            engineLoadTopology: {

                status:
                    engineLoadSelection
                        .status,

                deviceInstance:
                    engineLoadSelection
                        .deviceInstance,

                deviceInstances:
                    engineLoadSelection
                        .deviceInstances,
            },

            powerUnit:
                powerUnitQualification,
        },

        analytics,

        intervals: {

            status:
                productionIntervals
                    .status,

            reason:
                productionIntervals
                    .reason,

            totals:
                productionIntervals
                    .totals ??
                null,

            evidence:
                productionIntervals
                    .evidence ??
                null,

            generatorIntervals:
                productionIntervals
                    .generatorIntervals ??
                [],

            servedLoadIntervals:
                productionIntervals
                    .servedLoadIntervals ??
                [],
        },

        evidence: {

            rawInputRecordCount:
                Array.isArray(
                    records
                )
                    ? records.length
                    : 0,

            normalizedRecordCount:
                normalization
                    .records
                    .length,

            productionRecordCount:
                productionRecords
                    .length,

            generatorPowerTopologyQualified:
                powerTopology.status ===
                GENERATOR_PRODUCTION_TOPOLOGY_STATUS
                    .QUALIFIED,

            generatorPowerUnitQualified:
                powerUnitQualification
                    .status ===
                "QUALIFIED",

            stateDeviceQualified:
                stateSelection.status ===
                "SELECTED",

            engineLoadDeviceQualified:
                engineLoadSelection
                    .status ===
                "SELECTED",

            productionFuelEvidenceAssumed:
                false,

            productionGeneratorDemandAssumed:
                false,

            productionFailureIntervalsAssumed:
                false,
        },

        boundaries: {

            powerDeviceEqualsStateDevice:
                false,

            stateDeviceEqualsEngineLoadDevice:
                false,

            generatorPowerTopologyResolvedBeforeEnergy:
                true,

            powerUnitInferredFromMagnitude:
                false,

            generatorContributionUsesExactCommonIntervals:
                true,

            independentlyAggregatedEnergyUsedForContribution:
                false,

            runtimeConvertedToFuel:
                false,

            runtimeUsedAsAvailability:
                false,

            runningMeansAvailable:
                false,

            stoppedMeansUnavailable:
                false,

            zeroGeneratorPowerMeansFailure:
                false,

            activeSourceNotGeneratorMeansFailure:
                false,

            missingTelemetryMeansZero:
                false,

            monitoringOfflineMeansGeneratorFailure:
                false,
        },
    };
}


export default {

    GENERATOR_PRODUCTION_ANALYTICS_STATUS,

    GENERATOR_PRODUCTION_ANALYTICS_REASON,

    DEFAULT_GENERATOR_PRODUCTION_ANALYTICS_CONFIG,

    calculateGeneratorProductionAnalytics,
};