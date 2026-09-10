// services/engineering/batteryThroughputAggregationService.js

import {
    calculateBatteryCumulativeMetric,
    BATTERY_CYCLE_THROUGHPUT_ATTRIBUTE,
    BATTERY_CYCLE_THROUGHPUT_REASON,
} from "./batteryCycleThroughputService.js";

import {
    ENGINEERING_METRIC_STATUS,
    ENGINEERING_EVIDENCE_BASIS,
    ENGINEERING_DATA_QUALITY,
    ENGINEERING_OBSERVABILITY_STATUS,
    ENGINEERING_AGGREGATION_LEVEL,
    ENGINEERING_METRIC_FAMILY,
    ENGINEERING_SOURCE_TYPE,
    ENGINEERING_UNIT,

    buildEngineeringReportingWindow,
    buildEngineeringScope,
    buildEngineeringObservability,
    buildEngineeringDataQuality,
    buildCalculatedEngineeringMetric,
    buildUnavailableEngineeringMetric,
    buildPartialEngineeringMetric,
    buildEngineeringMetricFamily,
} from "./engineeringAnalyticsContract.js";


/*
|--------------------------------------------------------------------------
| Phase 8.4G-C4
| Battery Directional Energy / Throughput Aggregation
|--------------------------------------------------------------------------
|
| PURE SERVICE.
|
| No MongoDB.
| No API.
| No frontend.
|
| Primary evidence:
|
|   244 = cumulative discharged energy
|   245 = cumulative charged energy
|
| Supporting evidence only:
|
|   338 = discharged-energy delta
|   339 = charged-energy delta
|
| C3 did NOT establish sufficient fleet-wide correspondence to promote
| attrs 338/339 to trusted throughput KPIs.
|
|--------------------------------------------------------------------------
*/


/*
|--------------------------------------------------------------------------
| Reasons
|--------------------------------------------------------------------------
*/

export const BATTERY_THROUGHPUT_REASON =
    Object.freeze({

        QUALIFIED:
            "QUALIFIED",

        PARTIAL_DIRECTIONAL_ENERGY:
            "PARTIAL_DIRECTIONAL_ENERGY",

        DIRECTIONAL_ENERGY_UNAVAILABLE:
            "DIRECTIONAL_ENERGY_UNAVAILABLE",

        MIXED_DEVICE_IDENTITY:
            "MIXED_DEVICE_IDENTITY",

        MIXED_EVIDENCE_WINDOWS:
            "MIXED_EVIDENCE_WINDOWS",

        MIXED_EVIDENCE_CLASS:
            "MIXED_EVIDENCE_CLASS",

        INVALID_REPORTING_WINDOW:
            "INVALID_REPORTING_WINDOW",

        DELTA_ENERGY_NOT_PRIMARY:
            "DELTA_ENERGY_NOT_PRIMARY",

        CAPACITY_NOT_ESTABLISHED:
            "CAPACITY_NOT_ESTABLISHED",

        EQUIVALENT_FULL_CYCLES_UNAVAILABLE:
            "EQUIVALENT_FULL_CYCLES_UNAVAILABLE",
    });


/*
|--------------------------------------------------------------------------
| Boundaries
|--------------------------------------------------------------------------
*/

export const BATTERY_THROUGHPUT_BOUNDARIES =
    Object.freeze({

        PRIMARY_DISCHARGE_ATTRIBUTE:
            244,

        PRIMARY_CHARGE_ATTRIBUTE:
            245,

        DELTA_DISCHARGE_ATTRIBUTE:
            338,

        DELTA_CHARGE_ATTRIBUTE:
            339,

        DELTA_338_USED_AS_PRIMARY:
            false,

        DELTA_339_USED_AS_PRIMARY:
            false,

        MIXED_DEVICE_AGGREGATION_ALLOWED:
            false,

        MIXED_EVIDENCE_WINDOWS_ALLOWED:
            false,

        MIXED_EVIDENCE_CLASS_ALLOWED:
            false,

        SIGNED_POWER_USED_FOR_DIRECTIONAL_ENERGY:
            false,

        MISSING_DIRECTIONAL_ENERGY_EQUALS_ZERO:
            false,

        CAPACITY_413_QUALIFIED:
            false,

        EQUIVALENT_FULL_CYCLES_CALCULATED:
            false,

        BATTERY_DEGRADATION_INFERRED:
            false,
    });


/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

function round(
    value,
    decimals = 6
) {

    if (
        !Number.isFinite(
            value
        )
    ) {

        return null;
    }


    return Number(
        value.toFixed(
            decimals
        )
    );
}


function asDate(
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


function validReportingWindow(
    start,
    end
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
        endDate <=
            startDate
    ) {

        return null;
    }


    return buildEngineeringReportingWindow({

        start:
            startDate,

        end:
            endDate,
    });
}


function buildSiteScope({
    installationId = null,
    vrmSiteId = null,
} = {}) {

    return buildEngineeringScope({

        aggregationLevel:
            ENGINEERING_AGGREGATION_LEVEL
                .SITE,

        installationId,

        vrmSiteId,
    });
}


function sameString(
    left,
    right
) {

    if (
        left ===
            null ||
        left ===
            undefined ||
        right ===
            null ||
        right ===
            undefined
    ) {

        return false;
    }


    return String(
        left
    ) ===
        String(
            right
        );
}


function sameTimestamp(
    left,
    right
) {

    const leftDate =
        asDate(
            left
        );


    const rightDate =
        asDate(
            right
        );


    if (
        !leftDate ||
        !rightDate
    ) {

        return false;
    }


    return (
        leftDate.getTime() ===
        rightDate.getTime()
    );
}


/*
|--------------------------------------------------------------------------
| Evidence class
|--------------------------------------------------------------------------
|
| Distinguishes the meaning of directional metric.value.
|
|--------------------------------------------------------------------------
*/

function getEvidenceClass(
    metric
) {

    if (
        metric?.status ===
            ENGINEERING_METRIC_STATUS.CALCULATED &&
        metric?.reason ===
            BATTERY_CYCLE_THROUGHPUT_REASON
                .EXACT_REPORTING_WINDOW_BOUNDARIES
    ) {

        return "EXACT_REPORTING_WINDOW";
    }


    if (
        metric?.status ===
            ENGINEERING_METRIC_STATUS.PARTIALLY_CALCULATED &&
        metric?.reason ===
            BATTERY_CYCLE_THROUGHPUT_REASON
                .PARTIAL_REPORTING_WINDOW_BOUNDARIES
    ) {

        return "APPROXIMATE_REPORTING_WINDOW";
    }


    if (
        metric?.status ===
            ENGINEERING_METRIC_STATUS.PARTIALLY_CALCULATED &&
        metric?.reason ===
            BATTERY_CYCLE_THROUGHPUT_REASON
                .OBSERVED_SPAN_ONLY
    ) {

        return "OBSERVED_SPAN";
    }


    return "UNAVAILABLE";
}


/*
|--------------------------------------------------------------------------
| Directional metric source
|--------------------------------------------------------------------------
*/

function cumulativeEnergySources(
    attributeId
) {

    return [
        {
            type:
                ENGINEERING_SOURCE_TYPE
                    .VRM_TELEMETRY,

            collection:
                "Telemetry",

            field:
                "numericValue",

            metric:
                `vrmAttributeId:${attributeId}`,

            description:
                "Direct cumulative directional battery-energy counter.",
        },
    ];
}


/*
|--------------------------------------------------------------------------
| Throughput source
|--------------------------------------------------------------------------
*/

function throughputSources() {

    return [
        ...cumulativeEnergySources(
            BATTERY_CYCLE_THROUGHPUT_ATTRIBUTE
                .DISCHARGED_ENERGY_CUMULATIVE
        ),

        ...cumulativeEnergySources(
            BATTERY_CYCLE_THROUGHPUT_ATTRIBUTE
                .CHARGED_ENERGY_CUMULATIVE
        ),
    ];
}


/*
|--------------------------------------------------------------------------
| Directional wrapper
|--------------------------------------------------------------------------
|
| Preserve the source metric but expose a clearer directional-energy key.
|
|--------------------------------------------------------------------------
*/

function buildDirectionalEnergyMetric({
    sourceMetric,
    direction,
    reportingWindow,
    scope,
} = {}) {

    const isCharge =
        direction ===
        "CHARGE";


    const key =
        isCharge
            ? "chargedEnergyKwh"
            : "dischargedEnergyKwh";


    const label =
        isCharge
            ? "Charged Battery Energy"
            : "Discharged Battery Energy";


    const attributeId =
        isCharge
            ? BATTERY_CYCLE_THROUGHPUT_ATTRIBUTE
                .CHARGED_ENERGY_CUMULATIVE
            : BATTERY_CYCLE_THROUGHPUT_ATTRIBUTE
                .DISCHARGED_ENERGY_CUMULATIVE;


    if (
        !sourceMetric ||
        sourceMetric.status ===
            ENGINEERING_METRIC_STATUS.UNAVAILABLE
    ) {

        return buildUnavailableEngineeringMetric({

            key,

            label,

            family:
                ENGINEERING_METRIC_FAMILY
                    .BATTERY,

            reason:
                sourceMetric?.reason ??
                BATTERY_THROUGHPUT_REASON
                    .DIRECTIONAL_ENERGY_UNAVAILABLE,

            unit:
                ENGINEERING_UNIT
                    .KWH,

            evidenceBasis:
                ENGINEERING_EVIDENCE_BASIS
                    .NOT_ESTABLISHED,

            calculationMethod:
                "CUMULATIVE_DIRECTIONAL_ENERGY_COUNTER_DIFFERENCE",

            reportingWindow,

            scope,

            observability:
                sourceMetric
                    ?.observability ??
                buildEngineeringObservability({

                    status:
                        ENGINEERING_OBSERVABILITY_STATUS
                            .NOT_ESTABLISHED,

                    reason:
                        BATTERY_THROUGHPUT_REASON
                            .DIRECTIONAL_ENERGY_UNAVAILABLE,
                }),

            dataQuality:
                sourceMetric
                    ?.dataQuality ??
                buildEngineeringDataQuality({

                    status:
                        ENGINEERING_DATA_QUALITY
                            .INSUFFICIENT,

                    reason:
                        BATTERY_THROUGHPUT_REASON
                            .DIRECTIONAL_ENERGY_UNAVAILABLE,
                }),

            sources:
                cumulativeEnergySources(
                    attributeId
                ),

            metadata: {

                direction,

                attributeId,

                evidenceClass:
                    "UNAVAILABLE",

                sourceMetricStatus:
                    sourceMetric?.status ??
                    null,

                sourceMetricReason:
                    sourceMetric?.reason ??
                    null,
            },
        });
    }


    const evidenceClass =
        getEvidenceClass(
            sourceMetric
        );


    const commonOptions = {

        key,

        label,

        family:
            ENGINEERING_METRIC_FAMILY
                .BATTERY,

        reason:
            sourceMetric.reason,

        value:
            sourceMetric.value,

        unit:
            ENGINEERING_UNIT
                .KWH,

        evidenceBasis:
            ENGINEERING_EVIDENCE_BASIS
                .DERIVED,

        calculationMethod:
            "CUMULATIVE_DIRECTIONAL_ENERGY_COUNTER_DIFFERENCE",

        reportingWindow,

        scope,

        observability:
            sourceMetric
                .observability,

        dataQuality:
            sourceMetric
                .dataQuality,

        sources:
            cumulativeEnergySources(
                attributeId
            ),

        metadata: {

            ...sourceMetric.metadata,

            direction,

            attributeId,

            evidenceClass,

            primaryEvidence:
                true,

            deltaEnergyAttributeUsed:
                false,
        },
    };


    if (
        sourceMetric.status ===
        ENGINEERING_METRIC_STATUS
            .CALCULATED
    ) {

        return buildCalculatedEngineeringMetric(
            commonOptions
        );
    }


    return buildPartialEngineeringMetric(
        commonOptions
    );
}


/*
|--------------------------------------------------------------------------
| Compatibility
|--------------------------------------------------------------------------
*/

export function evaluateDirectionalEnergyCompatibility({
    chargedEnergy,
    dischargedEnergy,
} = {}) {

    if (
        !chargedEnergy ||
        !dischargedEnergy ||
        chargedEnergy.status ===
            ENGINEERING_METRIC_STATUS.UNAVAILABLE ||
        dischargedEnergy.status ===
            ENGINEERING_METRIC_STATUS.UNAVAILABLE
    ) {

        return {

            compatible:
                false,

            reason:
                BATTERY_THROUGHPUT_REASON
                    .DIRECTIONAL_ENERGY_UNAVAILABLE,

            evidenceClass:
                null,
        };
    }


    const chargedDevice =
        chargedEnergy
            .metadata
            ?.selectedDeviceInstance;


    const dischargedDevice =
        dischargedEnergy
            .metadata
            ?.selectedDeviceInstance;


    if (
        !sameString(
            chargedDevice,
            dischargedDevice
        )
    ) {

        return {

            compatible:
                false,

            reason:
                BATTERY_THROUGHPUT_REASON
                    .MIXED_DEVICE_IDENTITY,

            evidenceClass:
                null,
        };
    }


    const chargeClass =
        chargedEnergy
            .metadata
            ?.evidenceClass;


    const dischargeClass =
        dischargedEnergy
            .metadata
            ?.evidenceClass;


    if (
        chargeClass !==
        dischargeClass
    ) {

        return {

            compatible:
                false,

            reason:
                BATTERY_THROUGHPUT_REASON
                    .MIXED_EVIDENCE_CLASS,

            evidenceClass:
                null,
        };
    }


    /*
    |--------------------------------------------------------------------------
    | Observed-span compatibility
    |--------------------------------------------------------------------------
    |
    | Observed-span energy can only be added when both directional counters
    | describe exactly the same observation interval.
    |
    |--------------------------------------------------------------------------
    */

    if (
        chargeClass ===
        "OBSERVED_SPAN"
    ) {

        const sameStart =
            sameTimestamp(
                chargedEnergy
                    .metadata
                    ?.observedSpanStart,

                dischargedEnergy
                    .metadata
                    ?.observedSpanStart
            );


        const sameEnd =
            sameTimestamp(
                chargedEnergy
                    .metadata
                    ?.observedSpanEnd,

                dischargedEnergy
                    .metadata
                    ?.observedSpanEnd
            );


        if (
            !sameStart ||
            !sameEnd
        ) {

            return {

                compatible:
                    false,

                reason:
                    BATTERY_THROUGHPUT_REASON
                        .MIXED_EVIDENCE_WINDOWS,

                evidenceClass:
                    chargeClass,
            };
        }
    }


    /*
    |--------------------------------------------------------------------------
    | Reporting-window evidence
    |--------------------------------------------------------------------------
    |
    | EXACT_REPORTING_WINDOW and APPROXIMATE_REPORTING_WINDOW refer to the
    | common requested reporting window.
    |
    | Approximate values remain PARTIAL.
    |
    |--------------------------------------------------------------------------
    */

    return {

        compatible:
            true,

        reason:
            BATTERY_THROUGHPUT_REASON
                .QUALIFIED,

        evidenceClass:
            chargeClass,

        selectedDeviceInstance:
            chargedDevice,
    };
}


/*
|--------------------------------------------------------------------------
| Bidirectional throughput
|--------------------------------------------------------------------------
*/

function buildBidirectionalThroughput({
    chargedEnergy,
    dischargedEnergy,
    compatibility,
    reportingWindow,
    scope,
} = {}) {

    if (
        !compatibility
            .compatible
    ) {

        return buildUnavailableEngineeringMetric({

            key:
                "bidirectionalBatteryThroughputKwh",

            label:
                "Bidirectional Battery Throughput",

            family:
                ENGINEERING_METRIC_FAMILY
                    .BATTERY,

            reason:
                compatibility
                    .reason,

            unit:
                ENGINEERING_UNIT
                    .KWH,

            evidenceBasis:
                ENGINEERING_EVIDENCE_BASIS
                    .NOT_ESTABLISHED,

            calculationMethod:
                "CHARGED_ENERGY_PLUS_DISCHARGED_ENERGY",

            reportingWindow,

            scope,

            observability:
                buildEngineeringObservability({

                    status:
                        ENGINEERING_OBSERVABILITY_STATUS
                            .PARTIAL,

                    requiredFields: [
                        "chargedEnergyKwh",
                        "dischargedEnergyKwh",
                        "compatibleBatteryDevice",
                        "compatibleEvidenceWindow",
                    ],

                    observedFields: [
                        chargedEnergy?.status !==
                            ENGINEERING_METRIC_STATUS.UNAVAILABLE
                            ? "chargedEnergyKwh"
                            : null,

                        dischargedEnergy?.status !==
                            ENGINEERING_METRIC_STATUS.UNAVAILABLE
                            ? "dischargedEnergyKwh"
                            : null,
                    ].filter(
                        Boolean
                    ),

                    missingFields: [
                        compatibility.reason,
                    ],

                    coveragePercent:
                        null,

                    reason:
                        compatibility.reason,
                }),

            dataQuality:
                buildEngineeringDataQuality({

                    status:
                        ENGINEERING_DATA_QUALITY
                            .INSUFFICIENT,

                    reason:
                        compatibility.reason,
                }),

            sources:
                throughputSources(),

            metadata: {

                chargedEnergyStatus:
                    chargedEnergy
                        ?.status ??
                    null,

                dischargedEnergyStatus:
                    dischargedEnergy
                        ?.status ??
                    null,

                chargedEnergyEvidenceClass:
                    chargedEnergy
                        ?.metadata
                        ?.evidenceClass ??
                    null,

                dischargedEnergyEvidenceClass:
                    dischargedEnergy
                        ?.metadata
                        ?.evidenceClass ??
                    null,

                chargedDevice:
                    chargedEnergy
                        ?.metadata
                        ?.selectedDeviceInstance ??
                    null,

                dischargedDevice:
                    dischargedEnergy
                        ?.metadata
                        ?.selectedDeviceInstance ??
                    null,

                delta338Used:
                    false,

                delta339Used:
                    false,
            },
        });
    }


    const throughput =
        chargedEnergy.value +
        dischargedEnergy.value;


    const common = {

        key:
            "bidirectionalBatteryThroughputKwh",

        label:
            "Bidirectional Battery Throughput",

        family:
            ENGINEERING_METRIC_FAMILY
                .BATTERY,

        value:
            round(
                throughput
            ),

        unit:
            ENGINEERING_UNIT
                .KWH,

        evidenceBasis:
            ENGINEERING_EVIDENCE_BASIS
                .DERIVED,

        calculationMethod:
            "CHARGED_ENERGY_PLUS_DISCHARGED_ENERGY",

        reportingWindow,

        scope,

        observability:
            buildEngineeringObservability({

                status:
                    compatibility
                        .evidenceClass ===
                        "EXACT_REPORTING_WINDOW"
                        ? ENGINEERING_OBSERVABILITY_STATUS
                            .ESTABLISHED
                        : ENGINEERING_OBSERVABILITY_STATUS
                            .PARTIAL,

                requiredFields: [
                    "chargedEnergyKwh",
                    "dischargedEnergyKwh",
                    "compatibleBatteryDevice",
                    "compatibleEvidenceWindow",
                ],

                observedFields: [
                    "chargedEnergyKwh",
                    "dischargedEnergyKwh",
                    "compatibleBatteryDevice",
                    "compatibleEvidenceWindow",
                ],

                missingFields:
                    [],

                coveragePercent:
                    compatibility
                        .evidenceClass ===
                        "EXACT_REPORTING_WINDOW"
                        ? 100
                        : null,

                reason:
                    BATTERY_THROUGHPUT_REASON
                        .QUALIFIED,
            }),

        dataQuality:
            buildEngineeringDataQuality({

                status:
                    compatibility
                        .evidenceClass ===
                        "EXACT_REPORTING_WINDOW"
                        ? ENGINEERING_DATA_QUALITY
                            .GOOD
                        : ENGINEERING_DATA_QUALITY
                            .PARTIAL,

                reason:
                    compatibility
                        .evidenceClass ===
                        "EXACT_REPORTING_WINDOW"
                        ? BATTERY_THROUGHPUT_REASON
                            .QUALIFIED
                        : BATTERY_THROUGHPUT_REASON
                            .PARTIAL_DIRECTIONAL_ENERGY,
            }),

        sources:
            throughputSources(),

        metadata: {

            evidenceClass:
                compatibility
                    .evidenceClass,

            selectedDeviceInstance:
                compatibility
                    .selectedDeviceInstance,

            chargedEnergyKwh:
                chargedEnergy
                    .value,

            dischargedEnergyKwh:
                dischargedEnergy
                    .value,

            delta338Used:
                false,

            delta339Used:
                false,

            capacityUsed:
                false,

            equivalentFullCyclesCalculated:
                false,
        },
    };


    if (
        compatibility.evidenceClass ===
        "EXACT_REPORTING_WINDOW"
    ) {

        return buildCalculatedEngineeringMetric({

            ...common,

            reason:
                BATTERY_THROUGHPUT_REASON
                    .QUALIFIED,
        });
    }


    return buildPartialEngineeringMetric({

        ...common,

        reason:
            BATTERY_THROUGHPUT_REASON
                .PARTIAL_DIRECTIONAL_ENERGY,
    });
}


/*
|--------------------------------------------------------------------------
| Public engine
|--------------------------------------------------------------------------
*/

export function calculateBatteryThroughputAnalytics({
    records = [],
    start,
    end,
    deviceSelection = {},
    installationId = null,
    vrmSiteId = null,
    config = {},
} = {}) {

    const reportingWindow =
        validReportingWindow(
            start,
            end
        );


    const scope =
        buildSiteScope({

            installationId,

            vrmSiteId,
        });


    /*
    |--------------------------------------------------------------------------
    | Invalid reporting window
    |--------------------------------------------------------------------------
    */

    if (!reportingWindow) {

        const unavailable =
            [
                {
                    key:
                        "chargedEnergyKwh",

                    label:
                        "Charged Battery Energy",
                },
                {
                    key:
                        "dischargedEnergyKwh",

                    label:
                        "Discharged Battery Energy",
                },
                {
                    key:
                        "bidirectionalBatteryThroughputKwh",

                    label:
                        "Bidirectional Battery Throughput",
                },
            ].map(
                (
                    metric
                ) =>
                    buildUnavailableEngineeringMetric({

                        ...metric,

                        family:
                            ENGINEERING_METRIC_FAMILY
                                .BATTERY,

                        reason:
                            BATTERY_THROUGHPUT_REASON
                                .INVALID_REPORTING_WINDOW,

                        unit:
                            ENGINEERING_UNIT
                                .KWH,

                        evidenceBasis:
                            ENGINEERING_EVIDENCE_BASIS
                                .NOT_ESTABLISHED,

                        reportingWindow:
                            null,

                        scope,
                    })
            );


        return {

            ...buildEngineeringMetricFamily({

                family:
                    ENGINEERING_METRIC_FAMILY
                        .BATTERY,

                metrics:
                    unavailable,

                reportingWindow:
                    null,

                scope,

                boundary:
                    BATTERY_THROUGHPUT_BOUNDARIES,
            }),

            category:
                "BATTERY_THROUGHPUT",

            directional:
                {},

            throughput:
                unavailable[
                    2
                ],

            boundaries:
                BATTERY_THROUGHPUT_BOUNDARIES,
        };
    }


    /*
    |--------------------------------------------------------------------------
    | Cumulative directional source metrics
    |--------------------------------------------------------------------------
    */

    const dischargeSource =
        calculateBatteryCumulativeMetric({

            records,

            attributeId:
                BATTERY_CYCLE_THROUGHPUT_ATTRIBUTE
                    .DISCHARGED_ENERGY_CUMULATIVE,

            start,

            end,

            selectedDeviceInstance:
                deviceSelection[
                    BATTERY_CYCLE_THROUGHPUT_ATTRIBUTE
                        .DISCHARGED_ENERGY_CUMULATIVE
                ] ??
                null,

            installationId,

            vrmSiteId,

            config,
        });


    const chargeSource =
        calculateBatteryCumulativeMetric({

            records,

            attributeId:
                BATTERY_CYCLE_THROUGHPUT_ATTRIBUTE
                    .CHARGED_ENERGY_CUMULATIVE,

            start,

            end,

            selectedDeviceInstance:
                deviceSelection[
                    BATTERY_CYCLE_THROUGHPUT_ATTRIBUTE
                        .CHARGED_ENERGY_CUMULATIVE
                ] ??
                null,

            installationId,

            vrmSiteId,

            config,
        });


    /*
    |--------------------------------------------------------------------------
    | Directional engineering metrics
    |--------------------------------------------------------------------------
    */

    const dischargedEnergy =
        buildDirectionalEnergyMetric({

            sourceMetric:
                dischargeSource,

            direction:
                "DISCHARGE",

            reportingWindow,

            scope,
        });


    const chargedEnergy =
        buildDirectionalEnergyMetric({

            sourceMetric:
                chargeSource,

            direction:
                "CHARGE",

            reportingWindow,

            scope,
        });


    /*
    |--------------------------------------------------------------------------
    | Compatibility
    |--------------------------------------------------------------------------
    */

    const compatibility =
        evaluateDirectionalEnergyCompatibility({

            chargedEnergy,

            dischargedEnergy,
        });


    /*
    |--------------------------------------------------------------------------
    | Combined throughput
    |--------------------------------------------------------------------------
    */

    const throughput =
        buildBidirectionalThroughput({

            chargedEnergy,

            dischargedEnergy,

            compatibility,

            reportingWindow,

            scope,
        });


    const metrics = [
        chargedEnergy,
        dischargedEnergy,
        throughput,
    ];


    return {

        ...buildEngineeringMetricFamily({

            family:
                ENGINEERING_METRIC_FAMILY
                    .BATTERY,

            metrics,

            reportingWindow,

            scope,

            boundary:
                BATTERY_THROUGHPUT_BOUNDARIES,
        }),

        category:
            "BATTERY_THROUGHPUT",

        directional: {

            chargedEnergy,

            dischargedEnergy,
        },

        throughput,

        compatibility,

        supportingDeltaEnergyEvidence: {

            dischargedAttributeId:
                BATTERY_CYCLE_THROUGHPUT_ATTRIBUTE
                    .DISCHARGED_ENERGY_DELTA,

            chargedAttributeId:
                BATTERY_CYCLE_THROUGHPUT_ATTRIBUTE
                    .CHARGED_ENERGY_DELTA,

            primaryCalculationEnabled:
                false,

            reason:
                BATTERY_THROUGHPUT_REASON
                    .DELTA_ENERGY_NOT_PRIMARY,

            c3Finding:
                "Fleet-wide cumulative/delta correspondence was insufficient to promote attrs 338/339 to primary throughput KPIs.",
        },

        equivalentFullCycles: {

            status:
                ENGINEERING_METRIC_STATUS
                    .UNAVAILABLE,

            value:
                null,

            reason:
                BATTERY_THROUGHPUT_REASON
                    .CAPACITY_NOT_ESTABLISHED,

            capacityAttributeId:
                413,

            capacityQualified:
                false,
        },

        boundaries:
            BATTERY_THROUGHPUT_BOUNDARIES,
    };
}


export default {

    BATTERY_THROUGHPUT_REASON,

    BATTERY_THROUGHPUT_BOUNDARIES,

    evaluateDirectionalEnergyCompatibility,

    calculateBatteryThroughputAnalytics,
};