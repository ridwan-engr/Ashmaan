import mongoose from "mongoose";
import dns from "node:dns";
import dotenv from "dotenv";

import {
    runForecast,
} from "../services/forecasting/forecastRuntimeService.js";

dotenv.config();

dns.setServers([
    "1.1.1.1",
    "1.0.0.1",
]);

const vrmSiteId = "87666";

try {
    await mongoose.connect(
        process.env.MONGODB_URI
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
    await runForecast({
        targetFamily:
           "SITE_LOAD",
            vrmSiteId,

            trainingStart,
            forecastOrigin,
            forecastEnd,

            timezone: "UTC",

            servedLoadFamily:
                "PRIMARY",

            forecastIntervalMinutes:
                60,

            validationFraction:
                0.2,

            testFraction:
                0.2,

            minimumTrainingRows:
                5,

            maximumValidationMae:
                0.10,

            maximumTestMae:
                0.10,
        });

    console.log(
        JSON.stringify(
            result,
            null,
            2
        )
    );
}
catch (error) {
    console.error(
        "\nFORECAST RUNTIME FAILED\n"
    );

    console.error(error);

    process.exitCode = 1;
}
finally {
    await mongoose.disconnect();
}


