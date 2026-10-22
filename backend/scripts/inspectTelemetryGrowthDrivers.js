import mongoose from "mongoose";
import dotenv from "dotenv";
import dns from "node:dns";

import Telemetry from "../models/Telemetry.js";


dns.setServers([
    "1.1.1.1",
    "8.8.8.8",
]);
dotenv.config();

const MB = 1024 * 1024;

const printTable = (title, rows) => {
    console.log(`\n${title}\n`);

    if (!rows.length) {
        console.log("No records.");
        return;
    }

    console.table(rows);
};

const main = async () => {
    try {
        if (!process.env.MONGODB_URI) {
            throw new Error(
                "MONGODB_URI is missing."
            );
        }

        console.log(
            "\n=================================================="
        );

        console.log(
            "ASHMAAN TELEMETRY GROWTH DRIVER INSPECTION"
        );

        console.log(
            "READ-ONLY — NO DATABASE MODIFICATIONS"
        );

        console.log(
            "=================================================="
        );

        await mongoose.connect(
            process.env.MONGODB_URI
        );

        console.log(
            "\nMongoDB connected."
        );

        /*
        |--------------------------------------------------------------------------
        | Basic collection state
        |--------------------------------------------------------------------------
        */

        const totalDocuments =
            await Telemetry.countDocuments();

        const oldest =
            await Telemetry.findOne({})
                .sort({
                    timestamp: 1,
                })
                .select({
                    timestamp: 1,
                })
                .lean();

        const newest =
            await Telemetry.findOne({})
                .sort({
                    timestamp: -1,
                })
                .select({
                    timestamp: 1,
                })
                .lean();

        console.log(
            "\nCURRENT TELEMETRY STATE"
        );

        console.table([
            {
                documents:
                    totalDocuments,

                oldest:
                    oldest?.timestamp ||
                    null,

                newest:
                    newest?.timestamp ||
                    null,
            },
        ]);

        /*
        |--------------------------------------------------------------------------
        | Documents by installation
        |--------------------------------------------------------------------------
        */

        const byInstallation =
            await Telemetry.aggregate([
                {
                    $group: {
                        _id:
                            "$installation",

                        documents: {
                            $sum: 1,
                        },

                        oldest: {
                            $min:
                                "$timestamp",
                        },

                        newest: {
                            $max:
                                "$timestamp",
                        },
                    },
                },

                {
                    $sort: {
                        documents: -1,
                    },
                },

                {
                    $limit: 25,
                },

                {
                    $lookup: {
                        from:
                            "installations",

                        localField:
                            "_id",

                        foreignField:
                            "_id",

                        as:
                            "installation",
                    },
                },

                {
                    $unwind: {
                        path:
                            "$installation",

                        preserveNullAndEmptyArrays:
                            true,
                    },
                },

                {
                    $project: {
                        _id: 0,

                        vrmSiteId:
                            "$installation.vrmSiteId",

                        name:
                            "$installation.name",

                        documents: 1,

                        oldest: 1,

                        newest: 1,
                    },
                },
            ]);

        printTable(
            "TOP 25 INSTALLATIONS BY TELEMETRY DOCUMENT COUNT",
            byInstallation
        );

        /*
        |--------------------------------------------------------------------------
        | Documents by VRM attribute
        |--------------------------------------------------------------------------
        */

        const byAttribute =
            await Telemetry.aggregate([
                {
                    $group: {
                        _id: {
                            vrmAttributeId:
                                "$vrmAttributeId",

                            parameter:
                                "$parameter",

                            description:
                                "$description",

                            unit:
                                "$unit",
                        },

                        documents: {
                            $sum: 1,
                        },

                        installations: {
                            $addToSet:
                                "$installation",
                        },

                        oldest: {
                            $min:
                                "$timestamp",
                        },

                        newest: {
                            $max:
                                "$timestamp",
                        },
                    },
                },

                {
                    $project: {
                        _id: 0,

                        vrmAttributeId:
                            "$_id.vrmAttributeId",

                        parameter:
                            "$_id.parameter",

                        description:
                            "$_id.description",

                        unit:
                            "$_id.unit",

                        documents: 1,

                        sites: {
                            $size:
                                "$installations",
                        },

                        oldest: 1,

                        newest: 1,
                    },
                },

                {
                    $sort: {
                        documents: -1,
                    },
                },

                {
                    $limit: 50,
                },
            ]);

        printTable(
            "TOP 50 VRM ATTRIBUTES BY DOCUMENT COUNT",
            byAttribute
        );

        /*
        |--------------------------------------------------------------------------
        | Documents by device type
        |--------------------------------------------------------------------------
        */

        const byDeviceType =
            await Telemetry.aggregate([
                {
                    $group: {
                        _id:
                            "$deviceType",

                        documents: {
                            $sum: 1,
                        },
                    },
                },

                {
                    $sort: {
                        documents: -1,
                    },
                },
            ]);

        printTable(
            "DOCUMENTS BY DEVICE TYPE",
            byDeviceType.map(
                (row) => ({
                    deviceType:
                        row._id ||
                        "(missing)",

                    documents:
                        row.documents,
                })
            )
        );

        /*
        |--------------------------------------------------------------------------
        | Daily growth
        |--------------------------------------------------------------------------
        */

        const dailyGrowth =
            await Telemetry.aggregate([
                {
                    $group: {
                        _id: {
                            $dateToString: {
                                format:
                                    "%Y-%m-%d",

                                date:
                                    "$timestamp",

                                timezone:
                                    "Africa/Lagos",
                            },
                        },

                        documents: {
                            $sum: 1,
                        },

                        sites: {
                            $addToSet:
                                "$installation",
                        },
                    },
                },

                {
                    $project: {
                        _id: 0,

                        day:
                            "$_id",

                        documents: 1,

                        sites: {
                            $size:
                                "$sites",
                        },
                    },
                },

                {
                    $sort: {
                        day: -1,
                    },
                },

                {
                    $limit: 30,
                },
            ]);

        printTable(
            "TELEMETRY DOCUMENTS BY DAY — LAST 30 ACTIVE DAYS",
            dailyGrowth
        );

        /*
        |--------------------------------------------------------------------------
        | Hourly growth — recent 72 hours
        |--------------------------------------------------------------------------
        */

        const since =
            new Date(
                Date.now() -
                72 *
                60 *
                60 *
                1000
            );

        const hourlyGrowth =
            await Telemetry.aggregate([
                {
                    $match: {
                        timestamp: {
                            $gte:
                                since,
                        },
                    },
                },

                {
                    $group: {
                        _id: {
                            $dateToString: {
                                format:
                                    "%Y-%m-%d %H:00",

                                date:
                                    "$timestamp",

                                timezone:
                                    "Africa/Lagos",
                            },
                        },

                        documents: {
                            $sum: 1,
                        },

                        sites: {
                            $addToSet:
                                "$installation",
                        },
                    },
                },

                {
                    $project: {
                        _id: 0,

                        hour:
                            "$_id",

                        documents: 1,

                        sites: {
                            $size:
                                "$sites",
                        },
                    },
                },

                {
                    $sort: {
                        hour: -1,
                    },
                },
            ]);

        printTable(
            "TELEMETRY DOCUMENTS BY HOUR — LAST 72 HOURS",
            hourlyGrowth
        );

        /*
        |--------------------------------------------------------------------------
        | Storage footprint
        |--------------------------------------------------------------------------
        */

        const stats =
            await mongoose.connection.db
                .collection(
                    Telemetry.collection.name
                )
                .stats();

        printTable(
            "CURRENT COLLECTION FOOTPRINT",
            [
                {
                    documents:
                        stats.count,

                    logicalDataMB:
                        Number(
                            (
                                stats.size /
                                MB
                            ).toFixed(
                                2
                            )
                        ),

                    storageMB:
                        Number(
                            (
                                stats.storageSize /
                                MB
                            ).toFixed(
                                2
                            )
                        ),

                    indexesMB:
                        Number(
                            (
                                stats.totalIndexSize /
                                MB
                            ).toFixed(
                                2
                            )
                        ),
                },
            ]
        );

        console.log(
            "\nNo documents, collections, or indexes were modified."
        );

        console.log(
            "=================================================="
        );
    } finally {
        await mongoose.disconnect();
    }
};

main().catch(
    (error) => {
        console.error(
            "\nINSPECTION FAILED:",
            error
        );

        process.exitCode =
            1;
    }
);