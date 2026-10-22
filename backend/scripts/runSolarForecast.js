import mongoose from "mongoose";
import dns from "node:dns";
import dotenv from "dotenv";

import {
    runSolarForecast,
} from "../services/forecasting/forecastRuntimeService.js";


dotenv.config();


dns.setServers([
    "1.1.1.1",
    "1.0.0.1",
]);


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
            (
                7 *
                24 *
                60 *
                60 *
                1000
            )
        );


    const forecastEnd =
        new Date(
            forecastOrigin.getTime() +
            (
                24 *
                60 *
                60 *
                1000
            )
        );


    const result =
        await runSolarForecast({
            vrmSiteId:
                87666,

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

            /*
             * Deliberately no acceptance criteria.
             *
             * First Solar execution establishes:
             * - Engineering availability
             * - selected PV-power path
             * - selected device
             * - explicit source unit
             * - qualified observation count
             * - validation/test metrics
             *
             * No Solar production forecast should be persisted
             * until an explicit Solar acceptance policy exists.
             */
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