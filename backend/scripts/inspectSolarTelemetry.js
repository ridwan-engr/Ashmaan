import mongoose from "mongoose";
import dns from "node:dns";
import dotenv from "dotenv";

import {
    Installation,
    Telemetry,
} from "../models/index.js";


dotenv.config();


dns.setServers([
    "1.1.1.1",
    "1.0.0.1",
]);


const VRM_SITE_ID =
    87666;


const SOLAR_POWER_ATTRIBUTE_IDS =
    [
        442,
        113,
    ];


function summarize(
    records
) {
    return records.map(
        (
            record
        ) => ({
            timestamp:
                record.timestamp ?? null,

            vrmAttributeId:
                record.vrmAttributeId ?? null,

            parameter:
                record.parameter ?? null,

            description:
                record.description ?? null,

            numericValue:
                record.numericValue ?? null,

            value:
                record.value ?? null,

            unit:
                record.unit ?? null,

            quality:
                record.quality ?? null,

            aggregationLevel:
                record.aggregationLevel ?? null,

            deviceType:
                record.deviceType ?? null,

            deviceInstance:
                record.deviceInstance ?? null,

            dbusServiceType:
                record.dbusServiceType ?? null,

            dbusPath:
                record.dbusPath ?? null,
        })
    );
}


async function main() {
    const mongoUri =
        process.env.MONGODB_URI;


    if (
        !mongoUri
    ) {
        throw new Error(
            "MONGODB_URI is required."
        );
    }


    await mongoose.connect(
        mongoUri
    );


    const installation =
        await Installation
            .findOne({
                vrmSiteId: {
                    $in: [
                        VRM_SITE_ID,
                        String(
                            VRM_SITE_ID
                        ),
                    ],
                },
            })
            .select({
                _id:
                    1,

                vrmSiteId:
                    1,

                name:
                    1,

                lastSeenAt:
                    1,

                lastSyncAt:
                    1,
            })
            .lean();


    if (
        !installation
    ) {
        throw new Error(
            `Installation ${VRM_SITE_ID} not found.`
        );
    }


    const installationId =
        installation._id;


    const now =
        new Date();


    const sevenDaysAgo =
        new Date(
            now.getTime() -
            (
                7 *
                24 *
                60 *
                60 *
                1000
            )
        );


    /*
     * 1. Does this installation have telemetry at all?
     */
    const totalInstallationTelemetry =
        await Telemetry.countDocuments({
            installation:
                installationId,
        });


    /*
     * 2. What are the latest telemetry records for this installation?
     *
     * This tells us which attribute IDs are actually being persisted.
     */
    const latestInstallationRecords =
        await Telemetry
            .find({
                installation:
                    installationId,
            })
            .select({
                timestamp:
                    1,

                vrmAttributeId:
                    1,

                parameter:
                    1,

                description:
                    1,

                numericValue:
                    1,

                value:
                    1,

                unit:
                    1,

                quality:
                    1,

                aggregationLevel:
                    1,

                deviceType:
                    1,

                deviceInstance:
                    1,

                dbusServiceType:
                    1,

                dbusPath:
                    1,
            })
            .sort({
                timestamp:
                    -1,
            })
            .limit(
                50
            )
            .lean();


    /*
     * 3. Have attributes 442 or 113 ever been stored?
     *
     * No time/quality/aggregation restriction here.
     */
    const solarPowerEverCount =
        await Telemetry.countDocuments({
            installation:
                installationId,

            vrmAttributeId: {
                $in:
                    SOLAR_POWER_ATTRIBUTE_IDS,
            },
        });


    const latestSolarPowerEver =
        await Telemetry
            .find({
                installation:
                    installationId,

                vrmAttributeId: {
                    $in:
                        SOLAR_POWER_ATTRIBUTE_IDS,
                },
            })
            .select({
                timestamp:
                    1,

                vrmAttributeId:
                    1,

                parameter:
                    1,

                description:
                    1,

                numericValue:
                    1,

                value:
                    1,

                unit:
                    1,

                quality:
                    1,

                aggregationLevel:
                    1,

                deviceType:
                    1,

                deviceInstance:
                    1,

                dbusServiceType:
                    1,

                dbusPath:
                    1,
            })
            .sort({
                timestamp:
                    -1,
            })
            .limit(
                20
            )
            .lean();


    /*
     * 4. Do 442/113 records exist inside the same seven-day
     *    forecasting training horizon?
     *
     * Still no quality/aggregation restriction.
     */
    const solarPowerSevenDayCount =
        await Telemetry.countDocuments({
            installation:
                installationId,

            vrmAttributeId: {
                $in:
                    SOLAR_POWER_ATTRIBUTE_IDS,
            },

            timestamp: {
                $gte:
                    sevenDaysAgo,

                $lt:
                    now,
            },
        });


    /*
     * 5. Apply the exact production quality requirement only.
     */
    const solarPowerValidCount =
        await Telemetry.countDocuments({
            installation:
                installationId,

            vrmAttributeId: {
                $in:
                    SOLAR_POWER_ATTRIBUTE_IDS,
            },

            quality:
                "VALID",

            timestamp: {
                $gte:
                    sevenDaysAgo,

                $lt:
                    now,
            },
        });


    /*
     * 6. Apply the complete production predicate.
     *
     * This should correspond closely to what the Solar
     * production service can retrieve for PV power.
     */
    const solarPowerProductionQualifiedCount =
        await Telemetry.countDocuments({
            installation:
                installationId,

            vrmAttributeId: {
                $in:
                    SOLAR_POWER_ATTRIBUTE_IDS,
            },

            quality:
                "VALID",

            aggregationLevel:
                "RAW",

            timestamp: {
                $gte:
                    sevenDaysAgo,

                $lt:
                    now,
            },
        });


    /*
     * 7. Distribution of attribute IDs actually stored recently.
     *
     * This is important if 442/113 are absent but another
     * Solar-related VRM attribute is being persisted.
     */
    const recentAttributeDistribution =
        await Telemetry.aggregate([
            {
                $match: {
                    installation:
                        installationId,

                    timestamp: {
                        $gte:
                            sevenDaysAgo,

                        $lt:
                            now,
                    },
                },
            },

            {
                $group: {
                    _id:
                        "$vrmAttributeId",

                    count: {
                        $sum:
                            1,
                    },

                    latestTimestamp: {
                        $max:
                            "$timestamp",
                    },

                    units: {
                        $addToSet:
                            "$unit",
                    },

                    qualities: {
                        $addToSet:
                            "$quality",
                    },

                    aggregationLevels: {
                        $addToSet:
                            "$aggregationLevel",
                    },

                    deviceTypes: {
                        $addToSet:
                            "$deviceType",
                    },

                    deviceInstances: {
                        $addToSet:
                            "$deviceInstance",
                    },
                },
            },

            {
                $sort: {
                    count:
                        -1,
                },
            },
        ]);


    console.log(
        JSON.stringify(
            {
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

                    lastSeenAt:
                        installation.lastSeenAt ??
                        null,

                    lastSyncAt:
                        installation.lastSyncAt ??
                        null,
                },

                inspectionWindow: {
                    start:
                        sevenDaysAgo,

                    end:
                        now,
                },

                counts: {
                    totalInstallationTelemetry,

                    solarPowerEver:
                        solarPowerEverCount,

                    solarPowerSevenDays:
                        solarPowerSevenDayCount,

                    solarPowerSevenDaysValid:
                        solarPowerValidCount,

                    solarPowerSevenDaysValidRaw:
                        solarPowerProductionQualifiedCount,
                },

                latestSolarPowerEver:
                    summarize(
                        latestSolarPowerEver
                    ),

                recentAttributeDistribution,

                latestInstallationRecords:
                    summarize(
                        latestInstallationRecords
                    ),
            },
            null,
            2
        )
    );
}


main()
    .catch(
        (
            error
        ) => {
            console.error(
                error
            );

            process.exitCode =
                1;
        }
    )
    .finally(
        async () => {
            await mongoose.disconnect();
        }
    );