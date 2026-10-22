import "dotenv/config";
import dns from "node:dns";
import mongoose from "mongoose";

import {
    Installation,
    Telemetry,
} from "../models/index.js";

dns.setServers([
    "1.1.1.1",
    "1.0.0.1",
]);

const vrmSiteId = "87666";
const attributeIds = [333, 334];

try {
    await mongoose.connect(
        process.env.MONGODB_URI
    );

    const installation =
        await Installation
            .findOne({
                vrmSiteId,
            })
            .select({
                _id: 1,
                vrmSiteId: 1,
                name: 1,
            })
            .lean();

    if (!installation) {
        console.log(
            "INSTALLATION: NOT FOUND"
        );

        process.exitCode = 1;
    }
    else {
        console.log(
            "INSTALLATION:",
            installation.vrmSiteId
        );

        console.log(
            "NAME:",
            installation.name ?? "N/A"
        );

        for (
            const attributeId
            of attributeIds
        ) {
            const record =
                await Telemetry
                    .findOne({
                        installation:
                            installation._id,

                        vrmAttributeId:
                            attributeId,

                        timestamp: {
                            $type: "date",
                        },
                    })
                    .select({
                        _id: 0,
                        vrmAttributeId: 1,
                        timestamp: 1,
                        numericValue: 1,
                        value: 1,
                        unit: 1,
                        deviceType: 1,
                        deviceInstance: 1,
                        parameter: 1,
                        description: 1,
                        code: 1,
                        quality: 1,
                    })
                    .sort({
                        timestamp: -1,
                    })
                    .lean();

            console.log(
                `\n=== ATTRIBUTE ${attributeId} ===`
            );

            if (!record) {
                console.log(
                    "STATUS: NO RECORD"
                );

                continue;
            }

            console.log(
                "STATUS: FOUND"
            );

            console.log(
                "TIMESTAMP:",
                record.timestamp
            );

            console.log(
                "NUMERIC VALUE:",
                record.numericValue
            );

            console.log(
                "RAW VALUE:",
                record.value
            );

            console.log(
                "UNIT:",
                record.unit ?? "N/A"
            );

            console.log(
                "DEVICE TYPE:",
                record.deviceType ?? "N/A"
            );

            console.log(
                "DEVICE INSTANCE:",
                record.deviceInstance ?? "N/A"
            );

            console.log(
                "PARAMETER:",
                record.parameter ?? "N/A"
            );

            console.log(
                "DESCRIPTION:",
                record.description ?? "N/A"
            );

            console.log(
                "CODE:",
                record.code ?? "N/A"
            );

            console.log(
                "QUALITY:",
                record.quality ?? "N/A"
            );
        }
    }
}
catch (error) {
    console.error(
        "QUERY FAILED:",
        error?.message ?? error
    );

    process.exitCode = 1;
}
finally {
    await mongoose.disconnect();
}
