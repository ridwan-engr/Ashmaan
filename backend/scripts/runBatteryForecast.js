// scripts/runBatteryForecast.js

import mongoose from "mongoose";
import dns from "node:dns";
import dotenv from "dotenv";

import {
    runBatteryForecast,
} from "../services/forecasting/forecastRuntimeService.js";

dotenv.config();

dns.setServers([
    "1.1.1.1",
    "1.0.0.1",
]);

const VRM_SITE_ID =
    "87666";

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

    const forecastOrigin =
        new Date();

    const trainingStart =
        new Date(
            forecastOrigin.getTime() -
            7 * 24 * 60 * 60 * 1000
        );

    const forecastEnd =
        new Date(
            forecastOrigin.getTime() +
            24 * 60 * 60 * 1000
        );

    const result =
        await runBatteryForecast({
            vrmSiteId:
                VRM_SITE_ID,

            trainingStart,

            forecastOrigin,

            forecastEnd,

            timezone:
                "UTC",

            forecastIntervalMinutes:
                60,

            validationFraction:
                0.2,

            testFraction:
                0.2,

            minimumTrainingRows:
                5,

            maximumValidationMae:
                1,

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
