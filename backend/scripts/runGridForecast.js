// scripts/runGridForecast.js

import mongoose from "mongoose";
import dns from "node:dns";
import dotenv from "dotenv";

import {
    runGridForecast,
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


    const forecastOrigin =
        new Date();


    const trainingStart =
        new Date(
            forecastOrigin.getTime() -
            7 *
            24 *
            60 *
            60 *
            1000
        );


    const forecastEnd =
        new Date(
            forecastOrigin.getTime() +
            24 *
            60 *
            60 *
            1000
        );


    const result =
        await runGridForecast({
            vrmSiteId:
                VRM_SITE_ID,

            trainingStart,

            forecastOrigin,

            forecastEnd,

            timezone:
                "UTC",

            /*
             * Preserve the Engineering production default.
             * Source-state qualification may need evidence
             * immediately before the training window.
             */
            gridLookbackMinutes:
                30,

            /*
             * Preserve Engineering qualification policy.
             * Forecasting consumes only the qualified Grid
             * power samples produced by Engineering.
             */
            gridSourceStateConfig:
                {},

            gridPowerConfig:
                {},

            forecastIntervalMinutes:
                60,

            validationFraction:
                0.2,

            testFraction:
                0.2,

            minimumTrainingRows:
                5,

            /*
             * Integration-run acceptance criterion.
             *
             * The previous Grid baseline produced:
             *
             * validation MAE:
             *     17.75 W
             *
             * validation RMSE:
             *     22.276669409945463 W
             *
             * test MAE:
             *     20.75 W
             *
             * test RMSE:
             *     24.057223447438815 W
             *
             * 25 W is intentionally supplied here only to
             * exercise the existing model-qualification,
             * production-execution, and persistence path.
             *
             * This is not yet the final production/business
             * acceptance threshold.
             */
            maximumValidationMae:
                25,
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