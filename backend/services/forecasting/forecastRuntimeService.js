import Installation from "../../models/Installation.js";
import ForecastRecord from "../../models/ForecastRecord.js";

import {
    getSiteServedLoadTelemetry,
} from "../engineering/siteElectricalTelemetryAdapter.js";

import {
    buildServedLoadSeries,
} from "../engineering/siteElectricalPerformanceService.js";

import {
    getSolarProductionTelemetry,
} from "../engineering/solarProductionTelemetryService.js";

import {
    calculateProductionSolarPower,
} from "../engineering/solarProductionPowerIntegrationService.js";

import {
    SOLAR_POWER_ANALYTICS_STATUS,
} from "../engineering/solarPowerAnalyticsService.js";

import {
    getProductionGridTelemetryEvidence,
} from "../engineering/gridProductionTelemetryService.js";

import {
    buildProductionGridSourceStateFromEvidence,
} from "../engineering/gridProductionSourceStateIntegrationService.js";

import {
    calculateProductionGridPower,
} from "../engineering/gridProductionPowerEnergyIntegrationService.js";

import {
    GRID_POWER_ANALYTICS_STATUS,
} from "../engineering/gridPowerAnalyticsService.js";

import {
    buildForecastTimeContract,
    buildForecastTarget,
    FORECAST_TARGET_FAMILY,
    FORECAST_TARGET_KIND,
    FORECAST_OUTPUT_TYPE,
} from "./forecastingContract.js";

import {
    qualifyForecastInput,
} from "./forecastInputQualificationService.js";

import {
    getBatteryTelemetryForInstallation,
} from "../engineering/batteryTelemetryAdapter.js";

import {
    calculateGeneratorProductionAnalyticsFromMongo,
} from "../engineering/generatorProductionQueryService.js";

import {
    buildForecastFeatureDefinition,
    buildForecastFeatureSet,
    FORECAST_FEATURE_ROLE,
    FORECAST_FEATURE_VALUE_KIND,
    FORECAST_FEATURE_AVAILABILITY,
    FORECAST_FEATURE_TRANSFORM,
} from "./forecastFeatureContract.js";

import {
    materializeForecastFeatures,
} from "./forecastFeatureMaterializationService.js";

import {
    buildForecastEvaluationContract,
    buildForecastModelDefinition,
    FORECAST_MODEL_FAMILY,
    FORECAST_MODEL_TASK,
    FORECAST_EVALUATION_SPLIT,
} from "./forecastModelContract.js";

import {
    trainForecastBaseline,
} from "./forecastBaselineTrainingService.js";

import {
    buildForecastAcceptanceCriteria,
    qualifyForecastModel,
} from "./forecastModelQualificationService.js";

import {
    createForecastProductionContract,
} from "./forecastProductionContract.js";

import {
    executeProductionForecast,
} from "./forecastProductionExecutionService.js";

import {
    createForecastPersistenceContract,
} from "./forecastPersistenceContract.js";

import {
    persistForecast,
} from "./forecastPersistenceService.js";


export const FORECAST_RUNTIME_TARGETS =
    Object.freeze({
        SITE_LOAD:
            Object.freeze({
                family:
                    "SITE_LOAD",

                metric:
                    "activePower",

                unit:
                    "kW",

                modelName:
                    "site-load-naive-baseline",

                featureName:
                    "siteLoadActivePowerHistory",

                featureDescription:
                    "Qualified historical total site served-load active power.",

                modelDescription:
                    "Naive site-load baseline using the last observed qualified served-load value.",
            }),

        SOLAR:
            Object.freeze({
                family:
                    "SOLAR",

                metric:
                    "pvPower",

                /*
                 * Runtime unit is supplied by Engineering.
                 *
                 * Solar Engineering explicitly prohibits unit
                 * inference from magnitude.
                 */
                unit:
                    null,

                modelName:
                    "solar-power-naive-baseline",

                featureName:
                    "solarPvPowerHistory",

                featureDescription:
                    "Qualified historical Solar PV-input power.",

                modelDescription:
                    "Naive Solar PV-power baseline using the last observed Engineering-qualified PV-power value.",
            }),

        GRID:
            Object.freeze({
                family:
                    "GRID",

                metric:
                    "gridPower",

                /*
                 * Runtime unit is supplied by Engineering.
                 *
                 * Grid Engineering explicitly prohibits unit
                 * inference from magnitude.
                 */
                unit:
                    null,

                modelName:
                    "grid-power-naive-baseline",

                featureName:
                    "gridPowerHistory",

                featureDescription:
                    "Qualified historical Grid active power.",

                modelDescription:
                    "Naive Grid-power baseline using the last observed Engineering-qualified Grid-power value.",
            }),

        BATTERY:
            Object.freeze({
                family:
                    "BATTERY",

                metric:
                    "batteryPower",

                unit:
                    "W",

                modelName:
                    "battery-power-naive-baseline",

                featureName:
                    "batteryPowerHistory",

                featureDescription:
                    "Qualified historical signed Battery power.",

                modelDescription:
                    "Naive Battery-power baseline using the last observed qualified signed Battery-power value.",
            }),

        GENERATOR:
            Object.freeze({
                family:
                    "GENERATOR",

                metric:
                    "generatorPower",

                /*
                 * Generator Engineering owns the power unit.
                 *
                 * Forecasting must not infer W/kW from magnitude.
                 */
                unit:
                    null,

                modelName:
                    "generator-power-naive-baseline",

                featureName:
                    "generatorPowerHistory",

                featureDescription:
                    "Qualified historical Generator active power.",

                modelDescription:
                    "Naive Generator-power baseline using the last observed Engineering-qualified Generator-power value.",
            }),
    });


function asDate(
    value,
    label
) {
    const date =
        value instanceof Date
            ? new Date(
                value.getTime()
            )
            : new Date(
                value
            );

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        throw new Error(
            `${label} must be a valid date.`
        );
    }

    return date;
}


function finiteNonNegativeOrNull(
    value,
    label
) {
    if (
        value === null ||
        value === undefined
    ) {
        return null;
    }

    if (
        typeof value !==
        "number" ||
        !Number.isFinite(
            value
        ) ||
        value <
        0
    ) {
        throw new Error(
            `${label} must be a finite non-negative number when supplied.`
        );
    }

    return value;
}


function normalizeRequiredUnit(
    value
) {
    if (
        value === null ||
        value === undefined
    ) {
        return null;
    }

    const normalized =
        String(
            value
        ).trim();

    return normalized ===
        ""
        ? null
        : normalized;
}


function buildForecastTimestamps({
    forecastOrigin,
    forecastEnd,
    intervalMinutes,
} = {}) {
    if (
        !Number.isInteger(
            intervalMinutes
        ) ||
        intervalMinutes <=
        0
    ) {
        throw new Error(
            "intervalMinutes must be a positive integer."
        );
    }

    const timestamps =
        [];

    const stepMilliseconds =
        intervalMinutes *
        60 *
        1000;

    for (
        let timestamp =
            forecastOrigin.getTime();
        timestamp <
        forecastEnd.getTime();
        timestamp +=
        stepMilliseconds
    ) {
        timestamps.push(
            new Date(
                timestamp
            )
        );
    }

    return timestamps;
}


async function findInstallation(
    vrmSiteId
) {
    const candidates =
        [
            vrmSiteId,
            String(
                vrmSiteId
            ),
        ];

    const numeric =
        Number(
            vrmSiteId
        );

    if (
        Number.isFinite(
            numeric
        )
    ) {
        candidates.push(
            numeric
        );
    }

    return Installation.findOne({
        vrmSiteId: {
            $in:
                [
                    ...new Set(
                        candidates
                    ),
                ],
        },
    }).lean();
}


function trainingSummary(
    trainingResult
) {
    return {
        status:
            trainingResult?.status ??
            null,

        reason:
            trainingResult?.reason ??
            null,

        completeRowCount:
            trainingResult
                ?.completeRowCount ??
            0,

        partitions:
            trainingResult
                ?.partitions ??
            null,

        metrics:
            trainingResult
                ?.metrics ??
            null,

        artifact:
            trainingResult
                ?.artifact ??
            null,
    };
}


function inputQualificationSummary(
    inputQualification
) {
    return {
        status:
            inputQualification
                ?.qualification
                ?.status ??
            null,

        reason:
            inputQualification
                ?.qualification
                ?.reason ??
            null,
    };
}


function buildAcceptanceCriteriaInput({
    maximumValidationMae =
    null,

    maximumValidationRmse =
    null,

    maximumTestMae =
    null,

    maximumTestRmse =
    null,
} = {}) {
    return {
        maximumValidationMae:
            finiteNonNegativeOrNull(
                maximumValidationMae,
                "maximumValidationMae"
            ),

        maximumValidationRmse:
            finiteNonNegativeOrNull(
                maximumValidationRmse,
                "maximumValidationRmse"
            ),

        maximumTestMae:
            finiteNonNegativeOrNull(
                maximumTestMae,
                "maximumTestMae"
            ),

        maximumTestRmse:
            finiteNonNegativeOrNull(
                maximumTestRmse,
                "maximumTestRmse"
            ),
    };
}


async function resolveSiteLoadSource({
    installation,
    start,
    origin,
    servedLoadFamily =
    "PRIMARY",
} = {}) {
    const rawTelemetry =
        await getSiteServedLoadTelemetry({
            installationId:
                installation._id,

            start,

            end:
                origin,

            family:
                servedLoadFamily,
        });

    const servedLoadSeries =
        buildServedLoadSeries(
            rawTelemetry,
            {
                family:
                    servedLoadFamily,
            }
        );

    const unit =
        "kW";

    const observations =
        servedLoadSeries.samples.map(
            (
                sample
            ) => ({
                timestamp:
                    sample.timestamp,

                value:
                    sample.kw,

                unit,
            })
        );

    return {
        status:
            "AVAILABLE",

        reason:
            null,

        unit,

        observations,

        source: {
            layer:
                "ENGINEERING_ANALYTICS",

            service:
                "siteElectricalPerformanceService",

            operation:
                "buildServedLoadSeries",

            servedLoadFamily:
                servedLoadSeries.family,

            phases:
                servedLoadSeries.phases,

            rawRecordCount:
                rawTelemetry.length,

            qualifiedSampleCount:
                servedLoadSeries.samples.length,

            rejectedBucketCount:
                servedLoadSeries.rejectedBuckets,

            unit,
        },
    };
}


async function resolveSolarSource({
    installation,
    start,
    origin,
    selectedDeviceInstance =
    null,
    solarConfig = {},
} = {}) {
    /*
     * Solar production telemetry normally supports lookback for
     * production analytics. Forecast training does not require that
     * lookback because its training window is explicitly [start,origin).
     *
     * Therefore queryStart is exactly start here.
     */
    const rawTelemetry =
        await getSolarProductionTelemetry({
            installationId:
                installation._id,

            queryStart:
                start,

            end:
                origin,
        });

    const solarPower =
        calculateProductionSolarPower({
            records:
                rawTelemetry,

            start,

            end:
                origin,

            selectedDeviceInstance,

            config:
                solarConfig,
        });

    if (
        solarPower?.status !==
        SOLAR_POWER_ANALYTICS_STATUS
            .CALCULATED
    ) {
        return {
            status:
                "UNAVAILABLE",

            reason:
                solarPower?.reason ??
                "SOLAR_POWER_NOT_CALCULATED",

            unit:
                solarPower
                    ?.unit
                    ?.value ??
                null,

            observations:
                [],

            source: {
                layer:
                    "ENGINEERING_ANALYTICS",

                service:
                    "solarPowerAnalyticsService",

                operation:
                    "calculateSolarPowerAnalytics",

                rawRecordCount:
                    rawTelemetry.length,

                qualifiedSampleCount:
                    solarPower
                        ?.power
                        ?.sampleCount ??
                    0,

                selectedPath:
                    solarPower
                        ?.topology
                        ?.selectedPath ??
                    null,

                selectedDeviceInstance:
                    solarPower
                        ?.topology
                        ?.selectedDeviceInstance ??
                    null,

                observedDeviceInstances:
                    solarPower
                        ?.topology
                        ?.observedDeviceInstances ??
                    [],

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

                sourceAttributeId:
                    solarPower
                        ?.evidence
                        ?.sourceAttributeId ??
                    null,

                duplicateTimestampCount:
                    solarPower
                        ?.evidence
                        ?.duplicateTimestampCount ??
                    0,

                conflictingTimestampCount:
                    solarPower
                        ?.evidence
                        ?.conflictingTimestampCount ??
                    0,

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
            },

            engineering:
                solarPower,
        };
    }

    const unit =
        normalizeRequiredUnit(
            solarPower
                ?.unit
                ?.value
        );

    if (
        unit ===
        null
    ) {
        return {
            status:
                "UNAVAILABLE",

            reason:
                "SOLAR_POWER_UNIT_UNRESOLVED",

            unit:
                null,

            observations:
                [],

            source: {
                layer:
                    "ENGINEERING_ANALYTICS",

                service:
                    "solarPowerAnalyticsService",

                operation:
                    "calculateSolarPowerAnalytics",

                rawRecordCount:
                    rawTelemetry.length,

                qualifiedSampleCount:
                    solarPower
                        ?.power
                        ?.sampleCount ??
                    0,

                selectedPath:
                    solarPower
                        ?.topology
                        ?.selectedPath ??
                    null,

                selectedDeviceInstance:
                    solarPower
                        ?.topology
                        ?.selectedDeviceInstance ??
                    null,

                unitStatus:
                    solarPower
                        ?.unit
                        ?.status ??
                    null,

                unit:
                    null,
            },

            engineering:
                solarPower,
        };
    }

    const samples =
        Array.isArray(
            solarPower
                ?.power
                ?.samples
        )
            ? solarPower
                .power
                .samples
            : [];

    const observations =
        samples.map(
            (
                sample
            ) => ({
                timestamp:
                    sample.timestamp,

                value:
                    sample.value,

                unit,
            })
        );

    return {
        status:
            "AVAILABLE",

        reason:
            null,

        unit,

        observations,

        source: {
            layer:
                "ENGINEERING_ANALYTICS",

            service:
                "solarPowerAnalyticsService",

            operation:
                "calculateSolarPowerAnalytics",

            rawRecordCount:
                rawTelemetry.length,

            qualifiedSampleCount:
                samples.length,

            selectedPath:
                solarPower
                    ?.topology
                    ?.selectedPath ??
                null,

            selectedDeviceInstance:
                solarPower
                    ?.topology
                    ?.selectedDeviceInstance ??
                null,

            observedDeviceInstances:
                solarPower
                    ?.topology
                    ?.observedDeviceInstances ??
                [],

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

            sourceAttributeId:
                solarPower
                    ?.evidence
                    ?.sourceAttributeId ??
                null,

            duplicateTimestampCount:
                solarPower
                    ?.evidence
                    ?.duplicateTimestampCount ??
                0,

            conflictingTimestampCount:
                solarPower
                    ?.evidence
                    ?.conflictingTimestampCount ??
                0,

            unitStatus:
                solarPower
                    ?.unit
                    ?.status ??
                null,

            unit,
        },

        engineering:
            solarPower,
    };
}

async function resolveGridSource({
    installation,
    start,
    origin,

    selectedDeviceInstance =
    null,

    gridLookbackMinutes =
    30,

    gridSourceStateConfig = {},

    gridPowerConfig = {},

    generatorConfig = {},
} = {}) {
    /*
     * H-A owns the production telemetry/data-access boundary.
     *
     * Unlike Solar, Grid source-state qualification can require
     * evidence immediately before the Forecast training window.
     *
     * Therefore we intentionally use the production Grid evidence
     * bundle rather than querying telemetry directly.
     */
    const evidenceBundle =
        await getProductionGridTelemetryEvidence({
            installationId:
                installation._id,

            start,

            end:
                origin,

            lookbackMinutes:
                gridLookbackMinutes,
        });

    /*
     * H-C owns interpretation of attr471 and source-state topology.
     *
     * Forecasting must not independently decide whether VE.Bus
     * active-input power belongs to GRID.
     */
    const sourceStateResult =
        buildProductionGridSourceStateFromEvidence({
            evidenceBundle,

            selectedDeviceInstance,

            config:
                gridSourceStateConfig,
        });

    const sourceState =
        sourceStateResult
            ?.analytics
            ?.sourceState
            ?.value;

    /*
     * H-D owns Grid power qualification.
     *
     * calculateProductionGridPower() passes the preserved H-A
     * records and the H-C source-state intervals into the existing
     * Grid power analytics engine.
     */
    const gridPower =
        calculateProductionGridPower({
            siteResult:
                sourceStateResult,

            config:
                gridPowerConfig,
        });

    const rawRecordCount =
        Array.isArray(
            evidenceBundle?.records
        )
            ? evidenceBundle.records.length
            : 0;

    const reportingWindowRecordCount =
        evidenceBundle
            ?.evidence
            ?.reportingWindowRecordCount ??
        0;

    const sourceStateIntervalCount =
        Array.isArray(
            sourceState?.intervals
        )
            ? sourceState.intervals.length
            : 0;

    const samples =
        Array.isArray(
            gridPower
                ?.power
                ?.samples
        )
            ? gridPower.power.samples
            : [];

    /*
     * Engineering Grid power can legitimately be PARTIALLY_CALCULATED
     * when only part of the requested reporting window contains
     * authoritative Grid-qualified power evidence.
     *
     * Forecasting may consume those qualified samples. It must not
     * fabricate, interpolate, or otherwise replace unavailable
     * Engineering intervals.
     *
     * The downstream Forecast input qualification and training
     * contracts remain responsible for deciding whether the available
     * observations are sufficient for forecasting.
     */
    const gridPowerAvailable =
        gridPower?.status ===
        GRID_POWER_ANALYTICS_STATUS
            .CALCULATED ||
        gridPower?.status ===
        GRID_POWER_ANALYTICS_STATUS
            .PARTIALLY_CALCULATED;

    if (
        !gridPowerAvailable
    ) {
        return {
            status:
                "UNAVAILABLE",

            reason:
                gridPower?.reason ??
                "GRID_POWER_NOT_CALCULATED",

            unit:
                normalizeRequiredUnit(
                    gridPower
                        ?.power
                        ?.unit
                ),

            observations:
                [],

            source: {
                layer:
                    "ENGINEERING_ANALYTICS",

                service:
                    "gridPowerAnalyticsService",

                operation:
                    "calculateGridPowerAnalytics",

                rawRecordCount,

                reportingWindowRecordCount,

                qualifiedSampleCount:
                    samples.length,

                sourceStateStatus:
                    sourceState?.status ??
                    null,

                sourceStateReason:
                    sourceState?.reason ??
                    null,

                sourceStateIntervalCount,

                gridPowerStatus:
                    gridPower?.status ??
                    null,

                gridPowerReason:
                    gridPower?.reason ??
                    null,

                gridPowerSource:
                    gridPower?.source ??
                    null,

                topologyStatus:
                    gridPower
                        ?.topology
                        ?.status ??
                    null,

                selectedDeviceInstance:
                    gridPower
                        ?.topology
                        ?.selectedDeviceInstance ??
                    selectedDeviceInstance ??
                    null,

                unitStatus:
                    gridPower
                        ?.power
                        ?.unitStatus ??
                    null,

                unit:
                    gridPower
                        ?.power
                        ?.unit ??
                    null,
            },

            engineering: {
                evidence:
                    evidenceBundle,

                sourceState:
                    sourceStateResult,

                power:
                    gridPower,
            },
        };
    }

    /*
     * Engineering owns the Grid power unit.
     *
     * Do not infer W/kW from magnitude and do not convert values
     * inside Forecasting.
     */
    const unit =
        normalizeRequiredUnit(
            gridPower
                ?.power
                ?.unit
        );

    /*
     * "UNRESOLVED" is an Engineering sentinel, not a valid Forecast
     * target unit.
     *
     * This explicit check prevents the sentinel from accidentally
     * passing normalizeRequiredUnit(), which intentionally only
     * handles null/empty normalization.
     */
    const gridPowerUnitStatus =
        normalizeRequiredUnit(
            gridPower
                ?.power
                ?.unitStatus
        );

    if (
        unit ===
        null ||
        unit.toUpperCase() ===
        "UNRESOLVED" ||
        gridPowerUnitStatus ===
        null ||
        gridPowerUnitStatus.toUpperCase() !==
        "QUALIFIED"
    ) {
        return {
            status:
                "UNAVAILABLE",

            reason:
                "GRID_POWER_UNIT_UNRESOLVED",

            unit:
                null,

            observations:
                [],

            source: {
                layer:
                    "ENGINEERING_ANALYTICS",

                service:
                    "gridPowerAnalyticsService",

                operation:
                    "calculateGridPowerAnalytics",

                rawRecordCount,

                reportingWindowRecordCount,

                qualifiedSampleCount:
                    samples.length,

                sourceStateStatus:
                    sourceState?.status ??
                    null,

                sourceStateReason:
                    sourceState?.reason ??
                    null,

                sourceStateIntervalCount,

                gridPowerStatus:
                    gridPower?.status ??
                    null,

                gridPowerReason:
                    gridPower?.reason ??
                    null,

                gridPowerSource:
                    gridPower?.source ??
                    null,

                topologyStatus:
                    gridPower
                        ?.topology
                        ?.status ??
                    null,

                selectedDeviceInstance:
                    gridPower
                        ?.topology
                        ?.selectedDeviceInstance ??
                    selectedDeviceInstance ??
                    null,

                unitStatus:
                    gridPower
                        ?.power
                        ?.unitStatus ??
                    null,

                unit:
                    null,
            },

            engineering: {
                evidence:
                    evidenceBundle,

                sourceState:
                    sourceStateResult,

                power:
                    gridPower,
            },
        };
    }

    /*
     * Grid Engineering canonical samples expose the qualified
     * three-phase total as totalRawPower.
     *
     * Forecasting preserves that value exactly.
     *
     * IMPORTANT:
     *
     * H-A can include source-state lookback evidence before the
     * Forecast training start. Therefore the Forecast adapter must
     * explicitly preserve only observations inside:
     *
     *      [start, origin)
     *
     * No W/kW conversion, interpolation, zero filling, or missing
     * sample fabrication occurs here.
     */
    const observations =
        samples
            .map(
                (
                    sample
                ) => {
                    const timestamp =
                        new Date(
                            sample.timestamp
                        );

                    const value =
                        typeof sample.totalRawPower ===
                            "number"
                            ? sample.totalRawPower
                            : Number(
                                sample.totalRawPower
                            );

                    return {
                        timestamp,

                        value,

                        unit,
                    };
                }
            )
            .filter(
                (
                    observation
                ) =>
                    Number.isFinite(
                        observation
                            .timestamp
                            .getTime()
                    ) &&
                    observation.timestamp >=
                    start &&
                    observation.timestamp <
                    origin &&
                    Number.isFinite(
                        observation.value
                    )
            );

    if (
        observations.length ===
        0
    ) {
        return {
            status:
                "UNAVAILABLE",

            reason:
                "NO_QUALIFIED_GRID_POWER_SAMPLES",

            unit,

            observations:
                [],

            source: {
                layer:
                    "ENGINEERING_ANALYTICS",

                service:
                    "gridPowerAnalyticsService",

                operation:
                    "calculateGridPowerAnalytics",

                rawRecordCount,

                reportingWindowRecordCount,

                qualifiedSampleCount:
                    0,

                engineeringSampleCount:
                    samples.length,

                sourceStateStatus:
                    sourceState?.status ??
                    null,

                sourceStateReason:
                    sourceState?.reason ??
                    null,

                sourceStateIntervalCount,

                gridPowerStatus:
                    gridPower?.status ??
                    null,

                gridPowerReason:
                    gridPower?.reason ??
                    null,

                gridPowerSource:
                    gridPower?.source ??
                    null,

                topologyStatus:
                    gridPower
                        ?.topology
                        ?.status ??
                    null,

                selectedDeviceInstance:
                    gridPower
                        ?.topology
                        ?.selectedDeviceInstance ??
                    selectedDeviceInstance ??
                    null,

                unitStatus:
                    gridPower
                        ?.power
                        ?.unitStatus ??
                    null,

                unit,
            },

            engineering: {
                evidence:
                    evidenceBundle,

                sourceState:
                    sourceStateResult,

                power:
                    gridPower,
            },
        };
    }

    return {
        status:
            "AVAILABLE",

        reason:
            null,

        unit,

        observations,

        source: {
            layer:
                "ENGINEERING_ANALYTICS",

            service:
                "gridPowerAnalyticsService",

            operation:
                "calculateGridPowerAnalytics",

            rawRecordCount,

            reportingWindowRecordCount,

            qualifiedSampleCount:
                observations.length,

            engineeringSampleCount:
                samples.length,

            sourceStateStatus:
                sourceState?.status ??
                null,

            sourceStateReason:
                sourceState?.reason ??
                null,

            sourceStateIntervalCount,

            gridPowerStatus:
                gridPower?.status ??
                null,

            gridPowerReason:
                gridPower?.reason ??
                null,

            gridPowerSource:
                gridPower?.source ??
                null,

            topologyStatus:
                gridPower
                    ?.topology
                    ?.status ??
                null,

            selectedDeviceInstance:
                gridPower
                    ?.topology
                    ?.selectedDeviceInstance ??
                selectedDeviceInstance ??
                null,

            unitStatus:
                gridPower
                    ?.power
                    ?.unitStatus ??
                null,

            unit,
        },

        engineering: {
            evidence:
                evidenceBundle,

            sourceState:
                sourceStateResult,

            power:
                gridPower,
        },
    };
}

async function resolveBatterySource({
    installation,
    start,
    origin,

    selectedDeviceInstance =
    null,
} = {}) {
    /*
     * Battery Forecast source boundary.
     *
     * Production Battery telemetry owns the MongoDB/data-access
     * boundary.
     *
     * Forecast training consumes only the authoritative signed
     * Battery-power signal:
     *
     *     VRM attribute 243
     *
     * Directional semantics are intentionally NOT inferred.
     * Positive/negative values remain algebraic signed power only.
     *
     * Missing telemetry is not zero.
     * Multiple Battery devices are not automatically combined.
     * No interpolation or synthetic samples are introduced here.
     */

    const telemetryResult =
        await getBatteryTelemetryForInstallation({
            installation,
            start,
            end:
                origin,
        });

    const records =
        Array.isArray(
            telemetryResult?.records
        )
            ? telemetryResult.records
            : [];

    /*
     * Attribute 243 is the Engineering-approved signed
     * Battery-power signal.
     */
    const batteryPowerRecords =
        records.filter(
            (record) =>
                Number(
                    record?.vrmAttributeId
                ) ===
                243
        );

    if (
        batteryPowerRecords.length ===
        0
    ) {
        return {
            status:
                "UNAVAILABLE",

            reason:
                "NO_BATTERY_POWER_EVIDENCE",

            unit:
                null,

            observations:
                [],

            source: {
                layer:
                    "ENGINEERING_ANALYTICS",

                service:
                    "batteryTelemetryAdapter",

                operation:
                    "getBatteryTelemetryForInstallation",

                rawRecordCount:
                    records.length,

                qualifiedSampleCount:
                    0,

                selectedDeviceInstance:
                    selectedDeviceInstance ??
                    null,

                batteryPowerAttributeId:
                    243,

                signedPower:
                    true,

                directionalSemanticsEstablished:
                    false,

                unit:
                    null,
            },

            engineering: {
                telemetry:
                    telemetryResult?.evidence ??
                    null,
            },
        };
    }

    /*
     * Resolve Battery identity.
     *
     * Do not combine multiple devices implicitly.
     */
    const observedDeviceInstances =
        Array.from(
            new Set(
                batteryPowerRecords.map(
                    (record) =>
                        String(
                            record?.deviceInstance ??
                            "UNKNOWN"
                        )
                )
            )
        );

    let effectiveDeviceInstance =
        selectedDeviceInstance !==
            null &&
            selectedDeviceInstance !==
            undefined
            ? String(
                selectedDeviceInstance
            )
            : null;

    if (
        effectiveDeviceInstance ===
        null &&
        observedDeviceInstances.length >
        1
    ) {
        return {
            status:
                "UNAVAILABLE",

            reason:
                "MULTIPLE_BATTERY_DEVICES_AMBIGUOUS",

            unit:
                null,

            observations:
                [],

            source: {
                layer:
                    "ENGINEERING_ANALYTICS",

                service:
                    "batteryTelemetryAdapter",

                operation:
                    "getBatteryTelemetryForInstallation",

                rawRecordCount:
                    records.length,

                qualifiedSampleCount:
                    0,

                batteryPowerAttributeId:
                    243,

                observedDeviceInstances,

                selectedDeviceInstance:
                    null,

                signedPower:
                    true,

                directionalSemanticsEstablished:
                    false,

                unit:
                    null,
            },

            engineering: {
                telemetry:
                    telemetryResult?.evidence ??
                    null,
            },
        };
    }

    if (
        effectiveDeviceInstance ===
        null
    ) {
        effectiveDeviceInstance =
            observedDeviceInstances[0] ??
            null;
    }

    const selectedRecords =
        batteryPowerRecords.filter(
            (record) =>
                String(
                    record?.deviceInstance ??
                    "UNKNOWN"
                ) ===
                effectiveDeviceInstance
        );

    if (
        selectedRecords.length ===
        0
    ) {
        return {
            status:
                "UNAVAILABLE",

            reason:
                "SELECTED_BATTERY_DEVICE_NOT_OBSERVED",

            unit:
                null,

            observations:
                [],

            source: {
                layer:
                    "ENGINEERING_ANALYTICS",

                service:
                    "batteryTelemetryAdapter",

                operation:
                    "getBatteryTelemetryForInstallation",

                rawRecordCount:
                    records.length,

                qualifiedSampleCount:
                    0,

                batteryPowerAttributeId:
                    243,

                observedDeviceInstances,

                selectedDeviceInstance:
                    effectiveDeviceInstance,

                signedPower:
                    true,

                directionalSemanticsEstablished:
                    false,

                unit:
                    null,
            },

            engineering: {
                telemetry:
                    telemetryResult?.evidence ??
                    null,
            },
        };
    }

    /*
     * Attribute 243 is explicitly defined by Engineering as
     * signed Battery power in W.
     *
     * Preserve the signed numeric value exactly. Do not assign
     * charge/discharge meaning to the sign.
     */
    const unit =
        "W";

    const observations =
        selectedRecords
            .map(
                (record) => {
                    const timestamp =
                        record?.timestamp instanceof Date
                            ? record.timestamp
                            : new Date(
                                record?.timestamp
                            );

                    const candidate =
                        record?.numericValue ??
                        record?.value;

                    const value =
                        typeof candidate ===
                            "number"
                            ? candidate
                            : Number(
                                candidate
                            );

                    return {
                        timestamp,
                        value,
                        unit,
                    };
                }
            )
            .filter(
                (observation) =>
                    Number.isFinite(
                        observation
                            .timestamp
                            .getTime()
                    ) &&
                    observation.timestamp >=
                    start &&
                    observation.timestamp <
                    origin &&
                    Number.isFinite(
                        observation.value
                    )
            )
            .sort(
                (
                    a,
                    b
                ) =>
                    a.timestamp -
                    b.timestamp
            );

    if (
        observations.length ===
        0
    ) {
        return {
            status:
                "UNAVAILABLE",

            reason:
                "NO_QUALIFIED_BATTERY_POWER_SAMPLES",

            unit,

            observations:
                [],

            source: {
                layer:
                    "ENGINEERING_ANALYTICS",

                service:
                    "batteryTelemetryAdapter",

                operation:
                    "getBatteryTelemetryForInstallation",

                rawRecordCount:
                    records.length,

                batteryPowerRecordCount:
                    batteryPowerRecords.length,

                qualifiedSampleCount:
                    0,

                batteryPowerAttributeId:
                    243,

                observedDeviceInstances,

                selectedDeviceInstance:
                    effectiveDeviceInstance,

                signedPower:
                    true,

                directionalSemanticsEstablished:
                    false,

                unit,
            },

            engineering: {
                telemetry:
                    telemetryResult?.evidence ??
                    null,
            },
        };
    }

    return {
        status:
            "AVAILABLE",

        reason:
            "BATTERY_POWER_AVAILABLE",

        unit,

        observations,

        source: {
            layer:
                "ENGINEERING_ANALYTICS",

            service:
                "batteryTelemetryAdapter",

            operation:
                "getBatteryTelemetryForInstallation",

            rawRecordCount:
                records.length,

            batteryPowerRecordCount:
                batteryPowerRecords.length,

            qualifiedSampleCount:
                observations.length,

            batteryPowerAttributeId:
                243,

            observedDeviceInstances,

            selectedDeviceInstance:
                effectiveDeviceInstance,

            signedPower:
                true,

            directionalSemanticsEstablished:
                false,

            missingTelemetryMeansZero:
                false,

            syntheticValuesAllowed:
                false,

            unit,
        },

        engineering: {
            telemetry:
                telemetryResult?.evidence ??
                null,
        },
    };
}

async function resolveGeneratorSource({
    installation,
    start,
    origin,

    selectedDeviceInstance =
    null,

    servedLoadFamily =
    "PRIMARY",

    generatorConfig = {},
} = {}) {
    /*
     * Generator Forecast source boundary.
     *
     * Generator Engineering owns:
     *
     * - MongoDB telemetry retrieval
     * - generator power topology qualification
     * - device selection
     * - power-unit qualification
     * - production power semantics
     *
     * Forecasting must not independently infer Generator topology,
     * combine ambiguous devices, infer W/kW from magnitude, replace
     * missing telemetry with zero, or synthesize observations.
     */

    const deviceSelection =
        selectedDeviceInstance !==
            null &&
            selectedDeviceInstance !==
            undefined
            ? {
                powerDeviceInstance:
                    String(
                        selectedDeviceInstance
                    ),
            }
            : {};

    const generatorResult =
        await calculateGeneratorProductionAnalyticsFromMongo({
            installationId:
                installation._id,

            start,

            end:
                origin,

            deviceSelection,

            servedLoadFamily,

            analyticsConfig:
                generatorConfig,
        });

    const analytics =
        generatorResult?.analytics ??
        null;

    const preparation =
        analytics?.preparation ??
        null;

    const powerTopology =
        preparation?.powerTopology ??
        null;

    const powerUnit =
        preparation?.powerUnit ??
        null;

    const intervals =
        analytics?.intervals ??
        null;

    const rawRecordCount =
        generatorResult
            ?.query
            ?.evidence
            ?.recordCount ??
        generatorResult
            ?.evidence
            ?.retrievedRecordCount ??
        0;

    /*
     * Engineering must qualify Generator production before
     * Forecasting is allowed to consume it.
     */
    if (
        analytics?.status ===
        "UNAVAILABLE" ||
        powerTopology?.status ===
        "UNAVAILABLE"
    ) {
        return {
            status:
                "UNAVAILABLE",

            reason:
                powerTopology?.reason ??
                analytics?.reason ??
                "GENERATOR_POWER_NOT_CALCULATED",

            unit:
                null,

            observations:
                [],

            source: {
                layer:
                    "ENGINEERING_ANALYTICS",

                service:
                    "generatorProductionQueryService",

                operation:
                    "calculateGeneratorProductionAnalyticsFromMongo",

                rawRecordCount,

                qualifiedSampleCount:
                    0,

                analyticsStatus:
                    analytics?.status ??
                    null,

                analyticsReason:
                    analytics?.reason ??
                    null,

                topologyStatus:
                    powerTopology?.status ??
                    null,

                topologyReason:
                    powerTopology?.reason ??
                    null,

                topologySource:
                    powerTopology?.source ??
                    null,

                topologyMode:
                    powerTopology?.mode ??
                    null,

                selectedDeviceInstance:
                    powerTopology?.deviceInstance ??
                    selectedDeviceInstance ??
                    null,

                powerUnitStatus:
                    powerUnit?.status ??
                    null,

                unit:
                    null,

                missingTelemetryMeansZero:
                    false,

                syntheticValuesAllowed:
                    false,
            },

            engineering:
                generatorResult,
        };
    }

    /*
     * Generator Engineering owns unit qualification.
     *
     * "UNRESOLVED" is an Engineering sentinel and must not become
     * a Forecast target unit.
     */
    const unit =
        normalizeRequiredUnit(
            powerUnit?.powerUnit
        );

    if (
        unit ===
        null ||
        unit.toUpperCase() ===
        "UNRESOLVED" ||
        powerUnit?.status !==
        "QUALIFIED"
    ) {
        return {
            status:
                "UNAVAILABLE",

            reason:
                "GENERATOR_POWER_UNIT_UNRESOLVED",

            unit:
                null,

            observations:
                [],

            source: {
                layer:
                    "ENGINEERING_ANALYTICS",

                service:
                    "generatorProductionQueryService",

                operation:
                    "calculateGeneratorProductionAnalyticsFromMongo",

                rawRecordCount,

                qualifiedSampleCount:
                    0,

                analyticsStatus:
                    analytics?.status ??
                    null,

                analyticsReason:
                    analytics?.reason ??
                    null,

                topologyStatus:
                    powerTopology?.status ??
                    null,

                topologyReason:
                    powerTopology?.reason ??
                    null,

                topologySource:
                    powerTopology?.source ??
                    null,

                topologyMode:
                    powerTopology?.mode ??
                    null,

                selectedDeviceInstance:
                    powerTopology?.deviceInstance ??
                    selectedDeviceInstance ??
                    null,

                powerUnitStatus:
                    powerUnit?.status ??
                    null,

                unit:
                    null,

                missingTelemetryMeansZero:
                    false,

                syntheticValuesAllowed:
                    false,
            },

            engineering:
                generatorResult,
        };
    }

    /*
     * Production Generator intervals are the Engineering-qualified
     * downstream representation.
     *
     * Preserve only explicit Generator power observations inside the
     * Forecast training window [start, origin).
     *
     * No interpolation, zero filling, unit conversion, or future
     * observations are introduced here.
     */
    const generatorIntervals =
        Array.isArray(
            intervals?.generatorIntervals
        )
            ? intervals.generatorIntervals
            : [];

    const observations =
        generatorIntervals
            .map(
                (interval) => {
                    const timestampCandidate =
                        interval?.timestamp ??
                        interval?.start ??
                        interval?.intervalStart;

                    const valueCandidate =
                        interval?.power ??
                        interval?.powerValue ??
                        interval?.generatorPower ??
                        interval?.averagePower;

                    const timestamp =
                        timestampCandidate instanceof Date
                            ? timestampCandidate
                            : new Date(
                                timestampCandidate
                            );

                    const value =
                        typeof valueCandidate ===
                            "number"
                            ? valueCandidate
                            : Number(
                                valueCandidate
                            );

                    return {
                        timestamp,
                        value,
                        unit,
                    };
                }
            )
            .filter(
                (observation) =>
                    Number.isFinite(
                        observation
                            .timestamp
                            .getTime()
                    ) &&
                    observation.timestamp >=
                    start &&
                    observation.timestamp <
                    origin &&
                    Number.isFinite(
                        observation.value
                    )
            )
            .sort(
                (
                    a,
                    b
                ) =>
                    a.timestamp -
                    b.timestamp
            );

    if (
        observations.length ===
        0
    ) {
        return {
            status:
                "UNAVAILABLE",

            reason:
                "NO_QUALIFIED_GENERATOR_POWER_SAMPLES",

            unit,

            observations:
                [],

            source: {
                layer:
                    "ENGINEERING_ANALYTICS",

                service:
                    "generatorProductionQueryService",

                operation:
                    "calculateGeneratorProductionAnalyticsFromMongo",

                rawRecordCount,

                qualifiedSampleCount:
                    0,

                engineeringIntervalCount:
                    generatorIntervals.length,

                analyticsStatus:
                    analytics?.status ??
                    null,

                analyticsReason:
                    analytics?.reason ??
                    null,

                topologyStatus:
                    powerTopology?.status ??
                    null,

                topologyReason:
                    powerTopology?.reason ??
                    null,

                topologySource:
                    powerTopology?.source ??
                    null,

                topologyMode:
                    powerTopology?.mode ??
                    null,

                selectedDeviceInstance:
                    powerTopology?.deviceInstance ??
                    selectedDeviceInstance ??
                    null,

                powerUnitStatus:
                    powerUnit?.status ??
                    null,

                missingTelemetryMeansZero:
                    false,

                syntheticValuesAllowed:
                    false,

                unit,
            },

            engineering:
                generatorResult,
        };
    }

    return {
        status:
            "AVAILABLE",

        reason:
            "GENERATOR_POWER_AVAILABLE",

        unit,

        observations,

        source: {
            layer:
                "ENGINEERING_ANALYTICS",

            service:
                "generatorProductionQueryService",

            operation:
                "calculateGeneratorProductionAnalyticsFromMongo",

            rawRecordCount,

            qualifiedSampleCount:
                observations.length,

            engineeringIntervalCount:
                generatorIntervals.length,

            analyticsStatus:
                analytics?.status ??
                null,

            analyticsReason:
                analytics?.reason ??
                null,

            topologyStatus:
                powerTopology?.status ??
                null,

            topologyReason:
                powerTopology?.reason ??
                null,

            topologySource:
                powerTopology?.source ??
                null,

            topologyMode:
                powerTopology?.mode ??
                null,

            selectedDeviceInstance:
                powerTopology?.deviceInstance ??
                selectedDeviceInstance ??
                null,

            powerUnitStatus:
                powerUnit?.status ??
                null,

            missingTelemetryMeansZero:
                false,

            syntheticValuesAllowed:
                false,

            unit,
        },

        engineering:
            generatorResult,
    };
}

async function resolveForecastSource({
    targetFamily,
    installation,
    start,
    origin,

    servedLoadFamily =
    "PRIMARY",

    selectedDeviceInstance =
    null,

    solarConfig = {},

    gridLookbackMinutes =
    30,

    gridSourceStateConfig = {},

    gridPowerConfig = {},

    generatorConfig = {},
} = {}) {
    switch (
    targetFamily
    ) {
        case "SITE_LOAD":
            return resolveSiteLoadSource({
                installation,
                start,
                origin,
                servedLoadFamily,
            });

        case "SOLAR":
            return resolveSolarSource({
                installation,
                start,
                origin,
                selectedDeviceInstance,
                solarConfig,
            });

        case "GRID":
            return resolveGridSource({
                installation,
                start,
                origin,

                selectedDeviceInstance,

                gridLookbackMinutes,

                gridSourceStateConfig,

                gridPowerConfig,

                generatorConfig,
            });

        case "BATTERY":
            return resolveBatterySource({
                installation,
                start,
                origin,

                selectedDeviceInstance,
            });

        case "GENERATOR":
            return resolveGeneratorSource({
                installation,
                start,
                origin,

                selectedDeviceInstance,

                servedLoadFamily,

                generatorConfig,
            });

        default:
            return {
                status:
                    "UNAVAILABLE",

                reason:
                    "FORECAST_SOURCE_ADAPTER_NOT_INTEGRATED",

                unit:
                    null,

                observations:
                    [],

                source: {
                    layer:
                        "ENGINEERING_ANALYTICS",

                    service:
                        null,

                    operation:
                        null,
                },
            };
    }
}


async function runNumericPointForecast({
    runtimeTarget,
    installation,
    sourceResult,

    start,
    origin,
    end,

    timezone =
    "UTC",

    forecastIntervalMinutes =
    60,

    validationFraction =
    0.2,

    testFraction =
    0.2,

    minimumTrainingRows =
    5,

    maximumValidationMae =
    null,

    maximumValidationRmse =
    null,

    maximumTestMae =
    null,

    maximumTestRmse =
    null,
} = {}) {
    const targetUnit =
        normalizeRequiredUnit(
            sourceResult?.unit
        );

    if (
        targetUnit ===
        null
    ) {
        return {
            status:
                "UNAVAILABLE",

            stage:
                "SOURCE_ADAPTER",

            reason:
                "FORECAST_TARGET_UNIT_UNRESOLVED",

            vrmSiteId:
                String(
                    installation.vrmSiteId
                ),

            installationId:
                String(
                    installation._id
                ),

            target: {
                family:
                    runtimeTarget.family,

                metric:
                    runtimeTarget.metric,

                unit:
                    null,
            },

            source:
                sourceResult?.source ??
                null,
        };
    }

    const observations =
        Array.isArray(
            sourceResult?.observations
        )
            ? sourceResult.observations
            : [];

    const time =
        buildForecastTimeContract({
            trainingStart:
                start,

            forecastOrigin:
                origin,

            forecastEnd:
                end,

            timezone,
        });

    const target =
        buildForecastTarget({
            family:
                FORECAST_TARGET_FAMILY[
                runtimeTarget.family
                ],

            metric:
                runtimeTarget.metric,

            kind:
                FORECAST_TARGET_KIND
                    .NUMERIC,

            unit:
                targetUnit,

            installationId:
                String(
                    installation._id
                ),

            vrmSiteId:
                String(
                    installation.vrmSiteId
                ),
        });

    const source =
        sourceResult.source;

    const inputQualification =
        qualifyForecastInput({
            time,
            target,
            source,
            observations,
        });

    const targetHistoryFeature =
        buildForecastFeatureDefinition({
            name:
                runtimeTarget.featureName,

            role:
                FORECAST_FEATURE_ROLE
                    .TARGET_HISTORY,

            valueKind:
                FORECAST_FEATURE_VALUE_KIND
                    .NUMERIC,

            availability:
                FORECAST_FEATURE_AVAILABILITY
                    .OBSERVED_AT_OR_BEFORE_ORIGIN,

            source,

            unit:
                targetUnit,

            transform:
                FORECAST_FEATURE_TRANSFORM
                    .IDENTITY,

            description:
                runtimeTarget
                    .featureDescription,
        });

    const featureSet =
        buildForecastFeatureSet({
            target,
            inputQualification,

            features: [
                targetHistoryFeature,
            ],
        });

    const featureMaterialization =
        materializeForecastFeatures({
            featureSet,
        });

    const evaluation =
        buildForecastEvaluationContract({
            split:
                FORECAST_EVALUATION_SPLIT
                    .HOLDOUT,

            validationFraction,

            testFraction,

            minimumTrainingRows,
        });

    const modelContract =
        buildForecastModelDefinition({
            name:
                runtimeTarget.modelName,

            family:
                FORECAST_MODEL_FAMILY
                    .NAIVE,

            task:
                FORECAST_MODEL_TASK
                    .REGRESSION,

            targetKind:
                FORECAST_TARGET_KIND
                    .NUMERIC,

            outputType:
                FORECAST_OUTPUT_TYPE
                    .POINT,

            featureMaterialization,

            evaluation,

            hyperparameters:
                null,

            description:
                runtimeTarget
                    .modelDescription,
        });

    const trainingResult =
        trainForecastBaseline({
            modelContract,
        });

    const suppliedCriteria =
        buildAcceptanceCriteriaInput({
            maximumValidationMae,
            maximumValidationRmse,
            maximumTestMae,
            maximumTestRmse,
        });

    const hasAcceptanceCriterion =
        Object.values(
            suppliedCriteria
        ).some(
            (
                value
            ) =>
                value !==
                null
        );

    if (
        !hasAcceptanceCriterion
    ) {
        return {
            status:
                "AWAITING_ACCEPTANCE_CRITERIA",

            stage:
                "MODEL_QUALIFICATION",

            reason:
                "EXPLICIT_ACCEPTANCE_CRITERION_REQUIRED",

            vrmSiteId:
                String(
                    installation.vrmSiteId
                ),

            installationId:
                String(
                    installation._id
                ),

            target: {
                family:
                    runtimeTarget.family,

                metric:
                    runtimeTarget.metric,

                unit:
                    targetUnit,
            },

            source,

            inputQualification:
                inputQualificationSummary(
                    inputQualification
                ),

            featureMaterialization: {
                rowCount:
                    featureMaterialization
                        .rowCount,

                featureCount:
                    featureMaterialization
                        .featureCount,

                status:
                    featureMaterialization
                        .status,
            },

            training:
                trainingSummary(
                    trainingResult
                ),
        };
    }

    const criteria =
        buildForecastAcceptanceCriteria(
            suppliedCriteria
        );

    const qualification =
        qualifyForecastModel({
            trainingResult,
            criteria,
        });

    const productionContract =
        createForecastProductionContract({
            qualification,

            requestedOutputType:
                FORECAST_OUTPUT_TYPE
                    .POINT,
        });

    const forecastTimestamps =
        buildForecastTimestamps({
            forecastOrigin:
                origin,

            forecastEnd:
                end,

            intervalMinutes:
                forecastIntervalMinutes,
        });

    const executionResult =
        executeProductionForecast({
            productionContract,
            forecastTimestamps,
        });

    const persistenceContract =
        createForecastPersistenceContract({
            executionResult,
        });

    const persistenceResult =
        await persistForecast({
            persistenceContract,

            ForecastRecordModel:
                ForecastRecord,
        });

    return {
        status:
            persistenceResult
                ?.status ??
            executionResult
                ?.status ??
            qualification
                ?.status ??
            "UNKNOWN",

        stage:
            "PERSISTENCE",

        vrmSiteId:
            String(
                installation.vrmSiteId
            ),

        installationId:
            String(
                installation._id
            ),

        target: {
            family:
                runtimeTarget.family,

            metric:
                runtimeTarget.metric,

            unit:
                targetUnit,
        },

        source,

        inputQualification:
            inputQualificationSummary(
                inputQualification
            ),

        training:
            trainingSummary(
                trainingResult
            ),

        qualification: {
            status:
                qualification
                    ?.status ??
                null,

            reason:
                qualification
                    ?.reason ??
                null,

            qualified:
                qualification
                    ?.qualified ??
                false,

            validation:
                qualification
                    ?.validation ??
                null,

            test:
                qualification
                    ?.test ??
                null,
        },

        production: {
            eligibility:
                productionContract
                    ?.eligibility ??
                null,

            reason:
                productionContract
                    ?.reason ??
                null,

            executionStatus:
                executionResult
                    ?.status ??
                null,

            executionReason:
                executionResult
                    ?.reason ??
                null,

            forecastValueCount:
                executionResult
                    ?.forecast
                    ?.values
                    ?.length ??
                0,
        },

        persistence:
            persistenceResult,
    };
}


async function runIntegratedForecast({
    targetFamily,

    vrmSiteId,

    trainingStart,

    forecastOrigin =
    new Date(),

    forecastEnd,

    timezone =
    "UTC",

    servedLoadFamily =
    "PRIMARY",

    selectedDeviceInstance =
    null,

    solarConfig = {},

    gridLookbackMinutes =
    30,

    gridSourceStateConfig = {},

    gridPowerConfig = {},

    generatorConfig = {},

    forecastIntervalMinutes =
    60,

    validationFraction =
    0.2,

    testFraction =
    0.2,

    minimumTrainingRows =
    5,

    maximumValidationMae =
    null,

    maximumValidationRmse =
    null,

    maximumTestMae =
    null,

    maximumTestRmse =
    null,
} = {}) {
    if (
        vrmSiteId ===
        null ||
        vrmSiteId ===
        undefined ||
        String(
            vrmSiteId
        ).trim() ===
        ""
    ) {
        throw new Error(
            "vrmSiteId is required."
        );
    }

    const runtimeTarget =
        FORECAST_RUNTIME_TARGETS[
        targetFamily
        ];

    if (
        !runtimeTarget
    ) {
        throw new Error(
            `Unsupported forecast target family: ${targetFamily}`
        );
    }

    const origin =
        asDate(
            forecastOrigin,
            "forecastOrigin"
        );

    const start =
        asDate(
            trainingStart,
            "trainingStart"
        );

    const end =
        asDate(
            forecastEnd,
            "forecastEnd"
        );

    if (
        start >=
        origin
    ) {
        throw new Error(
            "trainingStart must be earlier than forecastOrigin."
        );
    }

    if (
        end <=
        origin
    ) {
        throw new Error(
            "forecastEnd must be later than forecastOrigin."
        );
    }

    const installation =
        await findInstallation(
            vrmSiteId
        );

    if (
        !installation
    ) {
        return {
            status:
                "UNAVAILABLE",

            stage:
                "INSTALLATION",

            reason:
                "INSTALLATION_NOT_FOUND",

            target: {
                family:
                    runtimeTarget.family,

                metric:
                    runtimeTarget.metric,

                unit:
                    runtimeTarget.unit,
            },

            vrmSiteId:
                String(
                    vrmSiteId
                ),
        };
    }

    const sourceResult =
        await resolveForecastSource({
            targetFamily,

            installation,

            start,

            origin,

            servedLoadFamily,

            selectedDeviceInstance,

            solarConfig,

            gridLookbackMinutes,

            gridSourceStateConfig,

            gridPowerConfig,

            generatorConfig,
        });
    if (
        sourceResult?.status !==
        "AVAILABLE"
    ) {
        return {
            status:
                "UNAVAILABLE",

            stage:
                "SOURCE_ADAPTER",

            reason:
                sourceResult?.reason ??
                "FORECAST_SOURCE_UNAVAILABLE",

            target: {
                family:
                    runtimeTarget.family,

                metric:
                    runtimeTarget.metric,

                unit:
                    sourceResult?.unit ??
                    runtimeTarget.unit ??
                    null,
            },

            vrmSiteId:
                String(
                    installation.vrmSiteId
                ),

            installationId:
                String(
                    installation._id
                ),

            source:
                sourceResult?.source ??
                null,

            engineering:
                sourceResult?.engineering ??
                null,
        };
    }

    return runNumericPointForecast({
        runtimeTarget,

        installation,

        sourceResult,

        start,

        origin,

        end,

        timezone,

        forecastIntervalMinutes,

        validationFraction,

        testFraction,

        minimumTrainingRows,

        maximumValidationMae,

        maximumValidationRmse,

        maximumTestMae,

        maximumTestRmse,
    });
}


export async function runSiteLoadForecast(
    options = {}
) {
    return runIntegratedForecast({
        targetFamily:
            "SITE_LOAD",

        ...options,
    });
}


export async function runSolarForecast(
    options = {}
) {
    return runIntegratedForecast({
        targetFamily:
            "SOLAR",

        ...options,
    });
}

export async function runGridForecast(
    options = {}
) {
    return runIntegratedForecast({
        targetFamily:
            "GRID",

        ...options,
    });
}

export async function runBatteryForecast(
    options = {}
) {
    return runIntegratedForecast({
        targetFamily:
            "BATTERY",

        ...options,
    });
}

export async function runGeneratorForecast(
    options = {}
) {
    return runIntegratedForecast({
        targetFamily:
            "GENERATOR",

        ...options,
    });
}

export async function runForecast({
    targetFamily =
    "SITE_LOAD",

    ...options
} = {}) {
    const normalizedFamily =
        String(
            targetFamily
        )
            .trim()
            .toUpperCase();

    const target =
        FORECAST_RUNTIME_TARGETS[
        normalizedFamily
        ];

    if (
        !target
    ) {
        throw new Error(
            `Unsupported forecast target family: ${targetFamily}`
        );
    }

    switch (
    normalizedFamily
    ) {
        case "SITE_LOAD":
            return runSiteLoadForecast(
                options
            );

        case "SOLAR":
            return runSolarForecast(
                options
            );

        case "GRID":
            return runGridForecast(
                options
            );

        case "BATTERY":
            return runBatteryForecast(
                options
            );

        case "GENERATOR":
            return runGeneratorForecast(
                options
            );

        default:
            return {
                status:
                    "UNAVAILABLE",

                stage:
                    "SOURCE_ADAPTER",

                reason:
                    "FORECAST_SOURCE_ADAPTER_NOT_INTEGRATED",

                target: {
                    family:
                        target.family,

                    metric:
                        target.metric,

                    unit:
                        target.unit,
                },

                vrmSiteId:
                    options.vrmSiteId !==
                        undefined &&
                        options.vrmSiteId !==
                        null
                        ? String(
                            options.vrmSiteId
                        )
                        : null,
            };
    }
}

export default Object.freeze({
    runForecast,
    runSiteLoadForecast,
    runSolarForecast,
    runGridForecast,
    runBatteryForecast,
    runGeneratorForecast,
    FORECAST_RUNTIME_TARGETS,
});