import "dotenv/config";
import dns from "dns";
import mongoose from "mongoose";

import {
    Installation,
} from "../models/index.js";

import {
    deriveInstallationStatus,
} from "../services/status/installationStatusService.js";


/*
|--------------------------------------------------------------------------
| DNS configuration
|--------------------------------------------------------------------------
|
| Required in this environment because the default DNS resolver has
| previously failed to resolve MongoDB Atlas SRV records.
|
*/

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


        /*
        |--------------------------------------------------------------------------
        | Load VRM installations
        |--------------------------------------------------------------------------
        */

        const installations =
            await Installation.find({
                source:
                    "VRM",
            })
                .sort({
                    name:
                        1,
                })
                .lean();


        const now =
            new Date();


        /*
        |--------------------------------------------------------------------------
        | Counters
        |--------------------------------------------------------------------------
        */

        const persistedCounts = {
            ONLINE:
                0,

            STALE:
                0,

            OFFLINE:
                0,

            UNKNOWN:
                0,

            INACTIVE:
                0,
        };


        const derivedCounts = {
            ONLINE:
                0,

            STALE:
                0,

            OFFLINE:
                0,

            UNKNOWN:
                0,

            INACTIVE:
                0,
        };


        const mismatches = [];

        const rows = [];


        /*
        |--------------------------------------------------------------------------
        | Audit every installation
        |--------------------------------------------------------------------------
        */

        for (
            const installation
            of installations
        ) {
            const persistedStatus =
                installation.status ||
                "UNKNOWN";


            if (
                Object.prototype
                    .hasOwnProperty.call(
                        persistedCounts,
                        persistedStatus
                    )
            ) {
                persistedCounts[
                    persistedStatus
                ] += 1;
            }


            const derived =
                deriveInstallationStatus({
                    lastSeenAt:
                        installation
                            .lastSeenAt,

                    syncEnabled:
                        installation
                            .syncEnabled,

                    persistedStatus:
                        installation
                            .status,

                    now,
                });


            if (
                Object.prototype
                    .hasOwnProperty.call(
                        derivedCounts,
                        derived.status
                    )
            ) {
                derivedCounts[
                    derived.status
                ] += 1;
            }


            const matches =
                persistedStatus ===
                derived.status;


            if (!matches) {
                mismatches.push({
                    vrmSiteId:
                        installation
                            .vrmSiteId,

                    name:
                        installation
                            .name,

                    persisted:
                        persistedStatus,

                    derived:
                        derived.status,

                    lastSeenAt:
                        installation
                            .lastSeenAt,

                    ageMinutes:
                        derived
                            .ageMinutes,
                });
            }


            rows.push({
                vrmSiteId:
                    installation
                        .vrmSiteId,

                name:
                    installation
                        .name,

                syncEnabled:
                    installation
                        .syncEnabled,

                persisted:
                    persistedStatus,

                derived:
                    derived.status,

                lastSeenAt:
                    installation
                        .lastSeenAt
                        ? new Date(
                            installation
                                .lastSeenAt
                        )
                            .toISOString()
                        : null,

                lastSyncAt:
                    installation
                        .lastSyncAt
                        ? new Date(
                            installation
                                .lastSyncAt
                        )
                            .toISOString()
                        : null,

                ageMinutes:
                    derived
                        .ageMinutes !==
                    null
                        ? Number(
                            derived
                                .ageMinutes
                                .toFixed(
                                    2
                                )
                        )
                        : null,

                matches:
                    matches
                        ? "YES"
                        : "NO",
            });
        }


        /*
        |--------------------------------------------------------------------------
        | Eligibility
        |--------------------------------------------------------------------------
        */

        const eligible =
            installations.filter(
                (
                    installation
                ) =>
                    installation
                        .source ===
                        "VRM" &&
                    installation
                        .syncEnabled ===
                        true &&
                    installation
                        .status !==
                        "INACTIVE"
            );


        const inactive =
            installations.filter(
                (
                    installation
                ) =>
                    installation
                        .status ===
                        "INACTIVE" ||
                    installation
                        .syncEnabled ===
                        false
            );


        /*
        |--------------------------------------------------------------------------
        | Output
        |--------------------------------------------------------------------------
        */

        console.log(
            "\n=============================="
        );

        console.log(
            "INSTALLATION STATUS AUDIT"
        );

        console.log(
            "=============================="
        );

        console.log(
            `Audit time: ${now.toISOString()}`
        );

        console.log(
            `Total VRM installations: ${installations.length}`
        );

        console.log(
            `Eligible installations: ${eligible.length}`
        );

        console.log(
            `Inactive/disabled: ${inactive.length}`
        );


        console.log(
            "\nPersisted status counts:"
        );

        console.table(
            persistedCounts
        );


        console.log(
            "\nDerived status counts:"
        );

        console.table(
            derivedCounts
        );


        console.log(
            "\n=============================="
        );

        console.log(
            "INSTALLATION DETAILS"
        );

        console.log(
            "=============================="
        );


        console.table(
            rows.map(
                ({
                    vrmSiteId,
                    name,
                    persisted,
                    derived,
                    ageMinutes,
                    matches,
                }) => ({
                    vrmSiteId,
                    name,
                    persisted,
                    derived,
                    ageMinutes,
                    matches,
                })
            )
        );


        console.log(
            "\n=============================="
        );

        console.log(
            "STATUS MISMATCHES"
        );

        console.log(
            "=============================="
        );


        if (
            mismatches.length === 0
        ) {
            console.log(
                "No persisted/derived status mismatches."
            );
        } else {
            console.table(
                mismatches
            );
        }


        console.log(
            `\nMismatch count: ${mismatches.length}`
        );


        /*
        |--------------------------------------------------------------------------
        | Acceptance checks
        |--------------------------------------------------------------------------
        */

        console.log(
            "\n=============================="
        );

        console.log(
            "ACCEPTANCE CHECKS"
        );

        console.log(
            "=============================="
        );


        console.log(
            `74 eligible installations: ${
                eligible.length === 74
                    ? "PASS"
                    : "CHECK"
            }`
        );


        console.log(
            `Persisted/derived status consistency: ${
                mismatches.length === 0
                    ? "PASS"
                    : "CHECK"
            }`
        );


        console.log(
            `Inactive/disabled installations preserved: ${
                inactive.length >= 1
                    ? "PASS"
                    : "CHECK"
            }`
        );
    } catch (error) {
        console.error(
            "Installation status audit failed:"
        );

        console.error(
            error
        );

        process.exitCode =
            1;
    } finally {
        await mongoose.disconnect();

        console.log(
            "\nMongoDB disconnected."
        );
    }
};


run();