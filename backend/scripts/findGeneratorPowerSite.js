// scripts/findGeneratorPowerSite.js

import mongoose from "mongoose";
import dns from "node:dns";
import dotenv from "dotenv";

import Telemetry from "../models/Telemetry.js";
import Installation from "../models/Installation.js";

dotenv.config();

dns.setServers([
    "1.1.1.1",
    "1.0.0.1",
]);

const GENERATOR_POWER_ATTRIBUTES = [
    1742,       // total generator power

    428,
    434,
    438,        // generator-device phase power

    137,
    138,
    139,        // system-overview genset phase power
];

async function main() {
    const mongoUri =
        process.env.MONGODB_URI;

    if (!mongoUri) {
        throw new Error(
            "MONGODB_URI is required."
        );
    }

    await mongoose.connect(
        mongoUri
    );

    const end =
        new Date();

    const start =
        new Date(
            end.getTime() -
            7 * 24 * 60 * 60 * 1000
        );

    const matches =
        await Telemetry.aggregate([
            {
                $match: {
                    timestamp: {
                        $gte:
                            start,
                        $lt:
                            end,
                    },

                    idDataAttribute: {
                        $in:
                            GENERATOR_POWER_ATTRIBUTES,
                    },

                    aggregationLevel:
                        "RAW",

                    quality:
                        "VALID",
                },
            },

            {
                $group: {
                    _id: {
                        installation:
                            "$installation",

                        attribute:
                            "$idDataAttribute",

                        deviceInstance:
                            "$deviceInstance",
                    },

                    count: {
                        $sum:
                            1,
                    },

                    firstTimestamp: {
                        $min:
                            "$timestamp",
                    },

                    lastTimestamp: {
                        $max:
                            "$timestamp",
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

    if (
        matches.length ===
        0
    ) {
        console.log(
            JSON.stringify(
                {
                    status:
                        "NO_GENERATOR_POWER_RECORDS",

                    reportingWindow: {
                        start,
                        end,
                    },

                    attributes:
                        GENERATOR_POWER_ATTRIBUTES,
                },
                null,
                2
            )
        );

        return;
    }

    const installationIds =
        [
            ...new Set(
                matches.map(
                    (item) =>
                        String(
                            item._id
                                .installation
                        )
                )
            ),
        ];

    const installations =
        await Installation.find({
            _id: {
                $in:
                    installationIds,
            },
        })
            .select(
                "_id vrmSiteId name"
            )
            .lean();

    const installationMap =
        new Map(
            installations.map(
                (installation) => [
                    String(
                        installation._id
                    ),

                    installation,
                ]
            )
        );

    const result =
        matches.map(
            (item) => {
                const installation =
                    installationMap.get(
                        String(
                            item._id
                                .installation
                        )
                    );

                return {
                    installationId:
                        String(
                            item._id
                                .installation
                        ),

                    vrmSiteId:
                        installation
                            ?.vrmSiteId ??
                        null,

                    name:
                        installation
                            ?.name ??
                        null,

                    attribute:
                        item._id
                            .attribute,

                    deviceInstance:
                        item._id
                            .deviceInstance ??
                        null,

                    count:
                        item.count,

                    firstTimestamp:
                        item.firstTimestamp,

                    lastTimestamp:
                        item.lastTimestamp,
                };
            }
        );

    console.log(
        JSON.stringify(
            {
                status:
                    "GENERATOR_POWER_EVIDENCE_FOUND",

                reportingWindow: {
                    start,
                    end,
                },

                matchCount:
                    result.length,

                matches:
                    result,
            },
            null,
            2
        )
    );
}

main()
    .catch(
        (error) => {
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
