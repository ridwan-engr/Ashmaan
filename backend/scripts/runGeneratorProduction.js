// scripts/runGeneratorProduction.js

import mongoose from "mongoose";
import dns from "node:dns";
import dotenv from "dotenv";

import {
    calculateGeneratorProductionAnalyticsFromMongo,
} from "../services/engineering/generatorProductionQueryService.js";

dotenv.config();

dns.setServers([
    "1.1.1.1",
    "1.0.0.1",
]);

const INSTALLATION_ID =
    "6a9ad973e107b5d6d6628cb7";

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

    const result =
        await calculateGeneratorProductionAnalyticsFromMongo({
            installationId:
                INSTALLATION_ID,

            start,

            end,

            deviceSelection:
                {},

            servedLoadFamily:
                "PRIMARY",
        });

    console.log(
        JSON.stringify(
            result,
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
