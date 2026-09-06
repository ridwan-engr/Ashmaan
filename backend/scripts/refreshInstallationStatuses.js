import "dotenv/config";
import dns from "dns";
import mongoose from "mongoose";

import {
    refreshInstallationStatuses,
} from "../services/status/refreshInstallationStatuses.js";


dns.setServers([
    "1.1.1.1",
    "8.8.8.8",
]);


const run = async () => {
    try {
        console.log(
            "Connecting to MongoDB..."
        );

        await mongoose.connect(
            process.env.MONGODB_URI
        );

        console.log(
            "MongoDB connected."
        );

        const result =
            await refreshInstallationStatuses();

        console.log(
            "\n=============================="
        );

        console.log(
            "INSTALLATION STATUS REFRESH"
        );

        console.log(
            "=============================="
        );

        console.log(
            result
        );
    } catch (error) {
        console.error(
            "Status refresh failed:"
        );

        console.error(
            error
        );

        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();

        console.log(
            "\nMongoDB disconnected."
        );
    }
};


run();