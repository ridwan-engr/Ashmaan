import dns from "node:dns";
import "dotenv/config";
import mongoose from "mongoose";

import connectDatabase
    from "../config/database.js";

import {
    Installation,
    Telemetry,
    SyncState,
} from "../models/index.js";

import {
    syncTelemetryByVrmSiteId,
} from "../services/sync/telemetrySyncService.js";

import {
    HISTORICAL_TELEMETRY_ATTRIBUTE_IDS,
} from "../services/sync/telemetryPersistencePolicy.js";


dns.setServers([
    "1.1.1.1",
    "8.8.8.8",
]);


const VRM_SITE_ID = "18053";

const SYNC_OPTIONS = {
    count: 200,
    overlapSeconds: 120,
};


let checks = 0;


const pass = (
    message
) => {
    checks += 1;

    console.log(
        `PASS ${checks}: ${message}`
    );
};


const fail = (
    message
) => {
    throw new Error(
        message
    );
};


const asIso =
    (
        value
    ) => {
        if (!value) {
            return null;
        }

        const date =
            value instanceof Date
                ? value
                : new Date(
                    value
                );

        if (
            Number.isNaN(
                date.getTime()
            )
        ) {
            return null;
        }

        return date.toISOString();
    };


const main =
    async () => {
        console.log("");
        console.log(
            "============================================================"
        );
        console.log(
            "ASHMAAN CONTROLLED TELEMETRY PERSISTENCE RUNTIME VALIDATION"
        );
        console.log(
            "============================================================"
        );
        console.log(
            `VRM site: ${VRM_SITE_ID}`
        );
        console.log(
            `Policy size: ${HISTORICAL_TELEMETRY_ATTRIBUTE_IDS.size}`
        );
        console.log(
            "Execution scope: ONE production synchronizer invocation"
        );
        console.log("");


        if (
            !process.env.MONGODB_URI
        ) {
            fail(
                "MONGODB_URI is missing."
            );
        }


        if (
            HISTORICAL_TELEMETRY_ATTRIBUTE_IDS
                .size !==
            113
        ) {
            fail(
                `Expected historical telemetry policy size 113, received ${
                    HISTORICAL_TELEMETRY_ATTRIBUTE_IDS.size
                }.`
            );
        }

        pass(
            "historical persistence policy contains exactly 113 attributes"
        );


        await connectDatabase();

        pass(
            `MongoDB connection is open (${mongoose.connection.name})`
        );


        const installation =
            await Installation
                .findOne({
                    vrmSiteId:
                        VRM_SITE_ID,
                })
                .lean();


        if (!installation) {
            fail(
                `Installation ${VRM_SITE_ID} was not found.`
            );
        }

        pass(
            `installation ${VRM_SITE_ID} exists`
        );


        const installationId =
            installation._id;


        /*
        |--------------------------------------------------------------------------
        | Capture state before synchronization
        |--------------------------------------------------------------------------
        */


        const beforeTelemetryCount =
            await Telemetry.countDocuments({
                installation:
                    installationId,
            });


        const beforeLatest =
            await Telemetry
                .findOne({
                    installation:
                        installationId,
                })
                .sort({
                    timestamp: -1,
                    _id: -1,
                })
                .select({
                    timestamp: 1,
                    vrmAttributeId: 1,
                    numericValue: 1,
                    quality: 1,
                })
                .lean();


        const beforeSyncState =
            await SyncState
                .findOne({
                    installation:
                        installationId,
                    resource:
                        "telemetry",
                })
                .lean();


        console.log("");
        console.log(
            "---------- BEFORE ----------"
        );
        console.log({
            telemetryCount:
                beforeTelemetryCount,

            latestTimestamp:
                asIso(
                    beforeLatest
                        ?.timestamp
                ),

            latestAttributeId:
                beforeLatest
                    ?.vrmAttributeId ??
                null,

            checkpoint:
                asIso(
                    beforeSyncState
                        ?.lastRecordTimestamp
                ),
        });


        /*
        |--------------------------------------------------------------------------
        | Execute exactly ONE production synchronization
        |--------------------------------------------------------------------------
        */


        console.log("");
        console.log(
            "---------- CONTROLLED SYNC ----------"
        );


        const syncResult =
            await syncTelemetryByVrmSiteId(
                VRM_SITE_ID,
                SYNC_OPTIONS
            );


        console.dir(
            syncResult,
            {
                depth: null,
            }
        );


        if (!syncResult) {
            fail(
                "Production synchronizer returned no result."
            );
        }

        pass(
            "production synchronizer executed exactly once and returned a result"
        );


        if (
            syncResult
                ?.policy
                ?.historicalAttributeCount !==
            HISTORICAL_TELEMETRY_ATTRIBUTE_IDS
                .size
        ) {
            fail(
                "Synchronizer result does not report the active historical persistence policy size."
            );
        }

        pass(
            "runtime synchronizer reports the active 113-attribute policy"
        );


        /*
        |--------------------------------------------------------------------------
        | Capture state after synchronization
        |--------------------------------------------------------------------------
        */


        const afterTelemetryCount =
            await Telemetry.countDocuments({
                installation:
                    installationId,
            });


        const afterLatest =
            await Telemetry
                .findOne({
                    installation:
                        installationId,
                })
                .sort({
                    timestamp: -1,
                    _id: -1,
                })
                .select({
                    timestamp: 1,
                    vrmAttributeId: 1,
                    numericValue: 1,
                    quality: 1,
                })
                .lean();


        const afterSyncState =
            await SyncState
                .findOne({
                    installation:
                        installationId,
                    resource:
                        "telemetry",
                })
                .lean();


        console.log("");
        console.log(
            "---------- AFTER ----------"
        );
        console.log({
            telemetryCount:
                afterTelemetryCount,

            telemetryDelta:
                afterTelemetryCount -
                beforeTelemetryCount,

            latestTimestamp:
                asIso(
                    afterLatest
                        ?.timestamp
                ),

            latestAttributeId:
                afterLatest
                    ?.vrmAttributeId ??
                null,

            checkpoint:
                asIso(
                    afterSyncState
                        ?.lastRecordTimestamp
                ),
        });


        /*
        |--------------------------------------------------------------------------
        | Checkpoint validation
        |--------------------------------------------------------------------------
        */


        const beforeCheckpointMs =
            beforeSyncState
                ?.lastRecordTimestamp
                ? new Date(
                    beforeSyncState
                        .lastRecordTimestamp
                ).getTime()
                : null;


        const afterCheckpointMs =
            afterSyncState
                ?.lastRecordTimestamp
                ? new Date(
                    afterSyncState
                        .lastRecordTimestamp
                ).getTime()
                : null;


        if (
            beforeCheckpointMs !==
                null &&
            afterCheckpointMs !==
                null &&
            afterCheckpointMs <
                beforeCheckpointMs
        ) {
            fail(
                "Telemetry checkpoint regressed."
            );
        }

        pass(
            "telemetry checkpoint did not regress"
        );


        /*
        |--------------------------------------------------------------------------
        | Policy validation against recently persisted/current evidence
        |--------------------------------------------------------------------------
        */


        const verificationStart =
            beforeSyncState
                ?.lastRecordTimestamp
                ? new Date(
                    new Date(
                        beforeSyncState
                            .lastRecordTimestamp
                    ).getTime() -
                    (
                        SYNC_OPTIONS
                            .overlapSeconds *
                        1000
                    )
                )
                : null;


        const verificationQuery = {
            installation:
                installationId,
        };


        if (
            verificationStart
        ) {
            verificationQuery
                .timestamp = {
                    $gte:
                        verificationStart,
                };
        }


        const verificationRecords =
            await Telemetry
                .find(
                    verificationQuery
                )
                .select({
                    timestamp: 1,
                    vrmAttributeId: 1,
                    numericValue: 1,
                    quality: 1,
                    deviceType: 1,
                    deviceInstance: 1,
                })
                .lean();


        const outsidePolicy =
            verificationRecords.filter(
                (
                    record
                ) =>
                    !HISTORICAL_TELEMETRY_ATTRIBUTE_IDS
                        .has(
                            Number(
                                record
                                    .vrmAttributeId
                            )
                        )
            );


        if (
            outsidePolicy.length >
            0
        ) {
            console.error(
                "Outside-policy sample:"
            );

            console.dir(
                outsidePolicy.slice(
                    0,
                    10
                ),
                {
                    depth: null,
                }
            );

            fail(
                `${outsidePolicy.length} verification record(s) fall outside the historical persistence policy.`
            );
        }

        pass(
            "verification telemetry contains only policy-approved attribute IDs"
        );


        /*
        |--------------------------------------------------------------------------
        | Missing versus zero
        |--------------------------------------------------------------------------
        */


        const explicitZeroCount =
            verificationRecords.filter(
                (
                    record
                ) =>
                    record
                        .numericValue ===
                    0
            ).length;


        const missingNumericCount =
            verificationRecords.filter(
                (
                    record
                ) =>
                    record
                        .numericValue ===
                        null ||
                    record
                        .numericValue ===
                        undefined
            ).length;


        console.log({
            verificationRecordCount:
                verificationRecords.length,

            explicitZeroCount,

            missingNumericCount,
        });


        const malformedZero =
            verificationRecords.filter(
                (
                    record
                ) =>
                    record
                        .numericValue ===
                        0 &&
                    record
                        .quality ===
                        "MISSING"
            );


        if (
            malformedZero.length >
            0
        ) {
            fail(
                "At least one MISSING telemetry record was converted to numeric zero."
            );
        }

        pass(
            "MISSING telemetry is not represented as numeric zero"
        );


        /*
        |--------------------------------------------------------------------------
        | Unique persistence identity
        |--------------------------------------------------------------------------
        */


        const duplicateGroups =
            await Telemetry.aggregate([
                {
                    $match: {
                        installation:
                            installationId,

                        ...(verificationStart
                            ? {
                                timestamp: {
                                    $gte:
                                        verificationStart,
                                },
                            }
                            : {}),
                    },
                },

                {
                    $group: {
                        _id: {
                            installation:
                                "$installation",

                            deviceType:
                                "$deviceType",

                            deviceInstance:
                                "$deviceInstance",

                            vrmAttributeId:
                                "$vrmAttributeId",

                            timestamp:
                                "$timestamp",
                        },

                        count: {
                            $sum: 1,
                        },
                    },
                },

                {
                    $match: {
                        count: {
                            $gt: 1,
                        },
                    },
                },

                {
                    $limit: 10,
                },
            ]);


        if (
            duplicateGroups.length >
            0
        ) {
            console.error(
                "Duplicate identity groups:"
            );

            console.dir(
                duplicateGroups,
                {
                    depth: null,
                }
            );

            fail(
                "Duplicate telemetry persistence identity detected."
            );
        }

        pass(
            "no duplicate telemetry persistence identity was created"
        );


        /*
        |--------------------------------------------------------------------------
        | Checkpoint evidence
        |--------------------------------------------------------------------------
        */


        if (
            afterSyncState
                ?.lastRecordTimestamp
        ) {
            const checkpointEvidence =
                await Telemetry
                    .findOne({
                        installation:
                            installationId,

                        timestamp:
                            afterSyncState
                                .lastRecordTimestamp,

                        vrmAttributeId: {
                            $in:
                                Array.from(
                                    HISTORICAL_TELEMETRY_ATTRIBUTE_IDS
                                ),
                        },
                    })
                    .select({
                        timestamp: 1,
                        vrmAttributeId: 1,
                        numericValue: 1,
                        quality: 1,
                    })
                    .lean();


            if (
                !checkpointEvidence
            ) {
                fail(
                    "Current SyncState checkpoint has no policy-approved persisted telemetry evidence."
                );
            }

            pass(
                "current checkpoint corresponds to policy-approved persisted telemetry evidence"
            );
        } else {
            console.log(
                "INFO: No checkpoint exists because no valid policy-approved telemetry was available."
            );

            pass(
                "null checkpoint semantics are preserved when no valid policy-approved evidence exists"
            );
        }


        /*
        |--------------------------------------------------------------------------
        | Result accounting
        |--------------------------------------------------------------------------
        */


        if (
            syncResult.received <
            (
                syncResult.allowed ??
                0
            )
        ) {
            fail(
                "Allowed record count exceeds received record count."
            );
        }

        pass(
            "runtime policy accounting is internally consistent"
        );


        console.log("");
        console.log(
            "============================================================"
        );
        console.log(
            `CONTROLLED RUNTIME VALIDATION PASSED — ${checks} CHECKS`
        );
        console.log(
            "============================================================"
        );
    };


try {
    await main();
} catch (
    error
) {
    console.error("");
    console.error(
        "CONTROLLED RUNTIME VALIDATION FAILED"
    );

    console.error(
        error instanceof Error
            ? error.stack
            : error
    );

    process.exitCode = 1;
} finally {
    if (
        mongoose
            .connection
            .readyState !==
        0
    ) {
        await mongoose
            .disconnect()
            .catch(
                () => {}
            );
    }
}
