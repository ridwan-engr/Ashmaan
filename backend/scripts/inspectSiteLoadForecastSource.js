import mongoose from "mongoose";
import dns from "node:dns";
import dotenv from "dotenv";

import Installation from "../models/Installation.js";
import {
    getSiteServedLoadTelemetry,
} from "../services/engineering/siteElectricalTelemetryAdapter.js";

dotenv.config();

dns.setServers([
    "1.1.1.1",
    "1.0.0.1",
]);

const vrmSiteId = "87666";

try {
    await mongoose.connect(process.env.MONGODB_URI);

    const installation =
        await Installation.findOne({
            vrmSiteId,
        }).lean();

    if (!installation) {
        throw new Error(
            `Installation not found for VRM site ${vrmSiteId}`
        );
    }

    const end =
        new Date();

    const start =
        new Date(
            end.getTime() -
            7 * 24 * 60 * 60 * 1000
        );

    const records =
        await getSiteServedLoadTelemetry({
            installationId:
                installation._id,
            start,
            end,
            family:
                "PRIMARY",
        });

    const units =
        [...new Set(
            records.map(
                (record) =>
                    record.unit ?? null
            )
        )];

    const attributes =
        [...new Set(
            records.map(
                (record) =>
                    String(
                        record.vrmAttributeId
                    )
            )
        )];

    const numericCount =
        records.filter(
            (record) =>
                typeof record.numericValue === "number" &&
                Number.isFinite(record.numericValue)
        ).length;

    const timestampCounts =
        new Map();

    for (const record of records) {
        const key =
            new Date(
                record.timestamp
            ).toISOString();

        timestampCounts.set(
            key,
            (timestampCounts.get(key) ?? 0) + 1
        );
    }

    const duplicateTimestampCount =
        [...timestampCounts.values()]
            .filter(
                (count) =>
                    count > 1
            )
            .length;

    console.log(
        JSON.stringify(
            {
                vrmSiteId,
                installationId:
                    String(installation._id),
                window: {
                    start:
                        start.toISOString(),
                    end:
                        end.toISOString(),
                },
                recordCount:
                    records.length,
                numericCount,
                units,
                attributeIds:
                    attributes,
                uniqueTimestampCount:
                    timestampCounts.size,
                duplicateTimestampCount,
                firstRecord:
                    records[0] ?? null,
                lastRecord:
                    records[
                        records.length - 1
                    ] ?? null,
            },
            null,
            2
        )
    );
}
finally {
    await mongoose.disconnect();
}

