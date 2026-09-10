// services/engineering/batteryCycleThroughputAdapter.js

import {
    Installation,
    Telemetry,
} from "../../models/index.js";

import {
    BATTERY_CYCLE_THROUGHPUT_ATTRIBUTE,
    calculateBatteryCycleThroughputCumulative,
} from "./batteryCycleThroughputService.js";

import {
    calculateBatteryThroughputAnalytics,
} from "./batteryThroughputAggregationService.js";


/*
|--------------------------------------------------------------------------
| Phase 8.4G-D
| Production Battery Cycle / Throughput Adapter
|--------------------------------------------------------------------------
|
| Production MongoDB adapter.
|
| Responsibilities:
|
| - resolve installation
| - retrieve relevant battery telemetry
| - preserve raw telemetry semantics
| - pass records into validated pure calculation services
|
| Does NOT:
|
| - infer missing values
| - combine ambiguous battery devices
| - interpret 338/339 as primary throughput
| - calculate EFC
| - repair counter decreases
|
|--------------------------------------------------------------------------
*/


const BATTERY_CYCLE_THROUGHPUT_ATTRIBUTE_IDS =
    Object.freeze([
        BATTERY_CYCLE_THROUGHPUT_ATTRIBUTE
            .CHARGE_CYCLES,

        BATTERY_CYCLE_THROUGHPUT_ATTRIBUTE
            .FULL_DISCHARGES,

        BATTERY_CYCLE_THROUGHPUT_ATTRIBUTE
            .DISCHARGED_ENERGY_CUMULATIVE,

        BATTERY_CYCLE_THROUGHPUT_ATTRIBUTE
            .CHARGED_ENERGY_CUMULATIVE,

        BATTERY_CYCLE_THROUGHPUT_ATTRIBUTE
            .DISCHARGED_ENERGY_DELTA,

        BATTERY_CYCLE_THROUGHPUT_ATTRIBUTE
            .CHARGED_ENERGY_DELTA,
    ]);


/*
|--------------------------------------------------------------------------
| Date helpers
|--------------------------------------------------------------------------
*/

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


function resolveWindow({
    start,
    end,
    lookbackHours = 24,
} = {}) {

    const endDate =
        asDate(
            end
        ) ??
        new Date();


    const startDate =
        asDate(
            start
        ) ??
        new Date(
            endDate.getTime() -
            24 *
            60 *
            60 *
            1000
        );


    /*
     * Extra history is required because cumulative counter state at the
     * reporting-window start may exist immediately before the window.
     */

    const queryStart =
        new Date(
            startDate.getTime() -
            lookbackHours *
            60 *
            60 *
            1000
        );


    return {

        start:
            startDate,

        end:
            endDate,

        queryStart,
    };
}


/*
|--------------------------------------------------------------------------
| Resolve installation
|--------------------------------------------------------------------------
*/

async function resolveInstallation({
    installationId = null,
    vrmSiteId = null,
} = {}) {

    if (
        !installationId &&
        !vrmSiteId
    ) {

        throw new Error(
            "installationId or vrmSiteId is required."
        );
    }


    const query =
        installationId
            ? {
                _id:
                    installationId,
            }
            : {
                vrmSiteId:
                    vrmSiteId,
            };


    const installation =
        await Installation
            .findOne(
                query
            )
            .select({

                _id:
                    1,

                vrmSiteId:
                    1,

                name:
                    1,

                status:
                    1,

                syncEnabled:
                    1,
            })
            .lean();


    if (
        !installation
    ) {

        throw new Error(
            "Installation not found."
        );
    }


    return installation;
}


/*
|--------------------------------------------------------------------------
| Retrieve telemetry
|--------------------------------------------------------------------------
*/

async function getCycleThroughputTelemetry({
    installationId,
    queryStart,
    end,
} = {}) {

    return Telemetry
        .find({

            installation:
                installationId,

            vrmAttributeId: {
                $in:
                    BATTERY_CYCLE_THROUGHPUT_ATTRIBUTE_IDS,
            },

            timestamp: {
                $gte:
                    queryStart,

                $lte:
                    end,
            },
        })
        .select({

            _id:
                0,

            installation:
                1,

            deviceType:
                1,

            deviceInstance:
                1,

            vrmAttributeId:
                1,

            timestamp:
                1,

            numericValue:
                1,

            value:
                1,
        })
        .sort({

            vrmAttributeId:
                1,

            deviceInstance:
                1,

            timestamp:
                1,
        })
        .lean();
}


/*
|--------------------------------------------------------------------------
| Evidence summary
|--------------------------------------------------------------------------
*/

function summarizeEvidence(
    records
) {

    const attributes =
        {};


    for (
        const attributeId
        of BATTERY_CYCLE_THROUGHPUT_ATTRIBUTE_IDS
    ) {

        const attributeRecords =
            records.filter(
                (
                    record
                ) =>
                    Number(
                        record.vrmAttributeId
                    ) ===
                    Number(
                        attributeId
                    )
            );


        const devices =
            Array.from(
                new Set(
                    attributeRecords.map(
                        (
                            record
                        ) =>
                            String(
                                record
                                    .deviceInstance ??
                                "UNKNOWN"
                            )
                    )
                )
            );


        attributes[
            attributeId
        ] = {

            recordCount:
                attributeRecords.length,

            deviceCount:
                devices.length,

            deviceInstances:
                devices,
        };
    }


    return {

        totalRecords:
            records.length,

        attributes,
    };
}


/*
|--------------------------------------------------------------------------
| Public production adapter
|--------------------------------------------------------------------------
*/

export async function getProductionBatteryCycleThroughputAnalytics({
    installationId = null,
    vrmSiteId = null,
    start = null,
    end = null,
    deviceSelection = {},
    config = {},
    lookbackHours = 24,
} = {}) {

    const installation =
        await resolveInstallation({

            installationId,

            vrmSiteId,
        });


    const window =
        resolveWindow({

            start,

            end,

            lookbackHours,
        });


    const records =
        await getCycleThroughputTelemetry({

            installationId:
                installation._id,

            queryStart:
                window.queryStart,

            end:
                window.end,
        });


    const cumulative =
        calculateBatteryCycleThroughputCumulative({

            records,

            start:
                window.start,

            end:
                window.end,

            deviceSelection,

            installationId:
                String(
                    installation._id
                ),

            vrmSiteId:
                String(
                    installation.vrmSiteId
                ),

            config,
        });


    const throughput =
        calculateBatteryThroughputAnalytics({

            records,

            start:
                window.start,

            end:
                window.end,

            deviceSelection,

            installationId:
                String(
                    installation._id
                ),

            vrmSiteId:
                String(
                    installation.vrmSiteId
                ),

            config,
        });


    return {

        installation: {

            id:
                String(
                    installation._id
                ),

            vrmSiteId:
                String(
                    installation.vrmSiteId
                ),

            name:
                installation.name ??
                null,

            status:
                installation.status ??
                null,

            syncEnabled:
                installation.syncEnabled ??
                null,
        },

        reportingWindow: {

            start:
                window.start,

            end:
                window.end,

            semantics:
                "[start,end)",

            queryStart:
                window.queryStart,

            lookbackHours,
        },

        evidence:
            summarizeEvidence(
                records
            ),

        cumulative,

        throughput,

        boundaries: {

            rawTelemetryPreserved:
                true,

            syntheticValuesUsed:
                false,

            multipleDevicesAutomaticallyCombined:
                false,

            counterDecreaseAutoReset:
                false,

            delta338Primary:
                false,

            delta339Primary:
                false,

            equivalentFullCyclesCalculated:
                false,
        },
    };
}


export default {

    getProductionBatteryCycleThroughputAnalytics,
};