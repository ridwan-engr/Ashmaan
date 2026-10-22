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
    HISTORICAL_TELEMETRY_ATTRIBUTE_IDS,
} from "../services/sync/telemetryPersistencePolicy.js";


dns.setServers([
    "1.1.1.1",
    "8.8.8.8",
]);


const VRM_SITE_ID =
    "18053";

/*
 * Controlled run observed:
 *
 * synchronization completed:
 * 2026-09-17T12:38:25.031Z
 *
 * Use a deliberately narrow creation-time envelope
 * around that single manually executed run.
 *
 * createdAt is insertion evidence.
 * timestamp is measurement evidence.
 *
 * They are intentionally not interchangeable.
 */
const CREATED_FROM =
    new Date(
        "2026-09-17T12:38:00.000Z"
    );

const CREATED_TO =
    new Date(
        "2026-09-17T12:39:00.000Z"
    );

const EXPECTED_INSERTED =
    31;

const EXPECTED_CHECKPOINT =
    new Date(
        "2026-09-17T12:37:26.000Z"
    );


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


const main =
    async () => {
        console.log("");
        console.log(
            "============================================================"
        );
        console.log(
            "ASHMAAN CONTROLLED TELEMETRY RUN — READ-ONLY VERIFICATION"
        );
        console.log(
            "============================================================"
        );
        console.log(
            `VRM site: ${VRM_SITE_ID}`
        );
        console.log(
            `Creation window: ${CREATED_FROM.toISOString()} -> ${CREATED_TO.toISOString()}`
        );
        console.log(
            "NO TELEMETRY OR SYNCSTATE WRITES ARE PERFORMED"
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
                `Expected policy size 113; received ${
                    HISTORICAL_TELEMETRY_ATTRIBUTE_IDS.size
                }.`
            );
        }

        pass(
            "active historical persistence policy contains exactly 113 attributes"
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
                .select({
                    _id: 1,
                    vrmSiteId: 1,
                })
                .lean();


        if (!installation) {
            fail(
                `Installation ${VRM_SITE_ID} was not found.`
            );
        }

        pass(
            "controlled installation exists"
        );


        /*
        |--------------------------------------------------------------------------
        | Exact production SyncState identity
        |--------------------------------------------------------------------------
        */


        const syncState =
            await SyncState
                .findOne({
                    installation:
                        installation._id,

                    source:
                        "VRM",

                    syncType:
                        "TELEMETRY",
                })
                .lean();


        if (!syncState) {
            fail(
                "Production TELEMETRY SyncState was not found."
            );
        }

        pass(
            "production TELEMETRY SyncState is resolved using its canonical identity"
        );


        console.log("");
        console.log(
            "---------- SYNC STATE ----------"
        );

        console.dir(
            {
                id:
                    syncState._id,

                source:
                    syncState.source,

                syncType:
                    syncState.syncType,

                status:
                    syncState.status,

                lastRecordTimestamp:
                    syncState
                        .lastRecordTimestamp,

                lastSuccessfulSyncAt:
                    syncState
                        .lastSuccessfulSyncAt,

                lastAttemptAt:
                    syncState
                        .lastAttemptAt,

                recordsProcessed:
                    syncState
                        .recordsProcessed,

                metadata:
                    syncState.metadata,
            },
            {
                depth: null,
            }
        );


        if (
            syncState.source !==
                "VRM" ||
            syncState.syncType !==
                "TELEMETRY"
        ) {
            fail(
                "Resolved SyncState does not have the production telemetry identity."
            );
        }

        pass(
            "SyncState identity is VRM / TELEMETRY"
        );


        if (
            syncState.status !==
            "SUCCESS"
        ) {
            fail(
                `Expected SyncState SUCCESS; received ${syncState.status}.`
            );
        }

        pass(
            "controlled synchronization persisted SUCCESS state"
        );


        const checkpoint =
            syncState
                .lastRecordTimestamp
                ? new Date(
                    syncState
                        .lastRecordTimestamp
                )
                : null;


        if (!checkpoint) {
            fail(
                "Controlled synchronization did not persist a checkpoint."
            );
        }


        if (
            checkpoint.getTime() !==
            EXPECTED_CHECKPOINT.getTime()
        ) {
            fail(
                `Expected checkpoint ${EXPECTED_CHECKPOINT.toISOString()}, received ${checkpoint.toISOString()}.`
            );
        }

        pass(
            "persisted checkpoint equals the controlled-run checkpoint"
        );


        /*
        |--------------------------------------------------------------------------
        | Isolate actual inserts by insertion time
        |--------------------------------------------------------------------------
        */


        const controlledRecords =
            await Telemetry
                .find({
                    installation:
                        installation._id,

                    createdAt: {
                        $gte:
                            CREATED_FROM,

                        $lt:
                            CREATED_TO,
                    },
                })
                .select({
                    timestamp: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    vrmAttributeId: 1,
                    numericValue: 1,
                    quality: 1,
                    deviceType: 1,
                    deviceInstance: 1,
                    source: 1,
                    aggregationLevel: 1,
                })
                .sort({
                    createdAt: 1,
                    timestamp: 1,
                })
                .lean();


        console.log("");
        console.log(
            "---------- CONTROLLED INSERTS ----------"
        );

        console.log({
            count:
                controlledRecords.length,

            expected:
                EXPECTED_INSERTED,

            firstCreatedAt:
                controlledRecords[0]
                    ?.createdAt ??
                null,

            lastCreatedAt:
                controlledRecords[
                    controlledRecords.length -
                    1
                ]?.createdAt ??
                null,

            oldestMeasurement:
                controlledRecords
                    .reduce(
                        (
                            current,
                            record
                        ) => {
                            if (
                                !record.timestamp
                            ) {
                                return current;
                            }

                            if (
                                !current ||
                                record.timestamp <
                                    current
                            ) {
                                return record
                                    .timestamp;
                            }

                            return current;
                        },
                        null
                    ),

            newestMeasurement:
                controlledRecords
                    .reduce(
                        (
                            current,
                            record
                        ) => {
                            if (
                                !record.timestamp
                            ) {
                                return current;
                            }

                            if (
                                !current ||
                                record.timestamp >
                                    current
                            ) {
                                return record
                                    .timestamp;
                            }

                            return current;
                        },
                        null
                    ),
        });


        if (
            controlledRecords.length !==
            EXPECTED_INSERTED
        ) {
            fail(
                `Expected exactly ${EXPECTED_INSERTED} site-18053 inserts in the controlled creation window; found ${controlledRecords.length}.`
            );
        }

        pass(
            "creation-time evidence isolates exactly the 31 controlled inserts"
        );


        /*
        |--------------------------------------------------------------------------
        | Historical persistence policy
        |--------------------------------------------------------------------------
        */


        const outsidePolicy =
            controlledRecords.filter(
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
                "Outside-policy controlled records:"
            );

            console.dir(
                outsidePolicy,
                {
                    depth: null,
                }
            );

            fail(
                `${outsidePolicy.length} controlled insert(s) fall outside the historical persistence policy.`
            );
        }

        pass(
            "all 31 controlled inserts are policy-approved"
        );


        /*
        |--------------------------------------------------------------------------
        | Source / aggregation contract
        |--------------------------------------------------------------------------
        */


        const invalidSource =
            controlledRecords.filter(
                (
                    record
                ) =>
                    record.source !==
                    "VRM"
            );


        if (
            invalidSource.length >
            0
        ) {
            fail(
                "Controlled inserts contain non-VRM source telemetry."
            );
        }

        pass(
            "all controlled inserts retain VRM source"
        );


        const invalidAggregation =
            controlledRecords.filter(
                (
                    record
                ) =>
                    record
                        .aggregationLevel !==
                    "RAW"
            );


        if (
            invalidAggregation.length >
            0
        ) {
            fail(
                "Controlled inserts contain non-RAW aggregation telemetry."
            );
        }

        pass(
            "all controlled inserts retain RAW aggregation level"
        );


        /*
        |--------------------------------------------------------------------------
        | Zero versus missing
        |--------------------------------------------------------------------------
        */


        const explicitZero =
            controlledRecords.filter(
                (
                    record
                ) =>
                    record
                        .numericValue ===
                    0
            );


        const missingNumeric =
            controlledRecords.filter(
                (
                    record
                ) =>
                    record
                        .numericValue ===
                        null ||
                    record
                        .numericValue ===
                        undefined
            );


        const missingAsZero =
            controlledRecords.filter(
                (
                    record
                ) =>
                    record.quality ===
                        "MISSING" &&
                    record.numericValue ===
                        0
            );


        console.log("");
        console.log(
            "---------- VALUE SEMANTICS ----------"
        );

        console.log({
            explicitZero:
                explicitZero.length,

            missingNumeric:
                missingNumeric.length,

            missingAsZero:
                missingAsZero.length,
        });


        if (
            missingAsZero.length >
            0
        ) {
            fail(
                "MISSING telemetry was converted to numeric zero."
            );
        }

        pass(
            "missing telemetry is not converted to numeric zero"
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
                            installation._id,

                        createdAt: {
                            $gte:
                                CREATED_FROM,

                            $lt:
                                CREATED_TO,
                        },
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
            ]);


        if (
            duplicateGroups.length >
            0
        ) {
            console.error(
                "Duplicate controlled identities:"
            );

            console.dir(
                duplicateGroups,
                {
                    depth: null,
                }
            );

            fail(
                "Duplicate persistence identity exists in the controlled inserts."
            );
        }

        pass(
            "controlled inserts contain no duplicate persistence identity"
        );


        /*
        |--------------------------------------------------------------------------
        | Checkpoint evidence
        |--------------------------------------------------------------------------
        */


        const checkpointEvidence =
            controlledRecords.filter(
                (
                    record
                ) =>
                    record.timestamp &&
                    new Date(
                        record.timestamp
                    ).getTime() ===
                    checkpoint.getTime()
            );


        if (
            checkpointEvidence.length ===
            0
        ) {
            fail(
                "Persisted checkpoint has no corresponding controlled telemetry evidence."
            );
        }


        const invalidCheckpointEvidence =
            checkpointEvidence.filter(
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
            invalidCheckpointEvidence.length >
            0
        ) {
            fail(
                "Checkpoint evidence falls outside the persistence policy."
            );
        }

        pass(
            "checkpoint corresponds to policy-approved controlled telemetry evidence"
        );


        /*
        |--------------------------------------------------------------------------
        | Metadata accounting
        |--------------------------------------------------------------------------
        */


        const metadata =
            syncState.metadata ??
            {};


        console.log("");
        console.log(
            "---------- ACCOUNTING ----------"
        );

        console.dir(
            {
                lastReceived:
                    metadata
                        .lastReceived,

                lastAllowed:
                    metadata
                        .lastAllowed,

                lastPolicyRejected:
                    metadata
                        .lastPolicyRejected,

                lastMissingAttributeId:
                    metadata
                        .lastMissingAttributeId,

                lastCheckpointFiltered:
                    metadata
                        .lastCheckpointFiltered,

                lastProcessed:
                    metadata
                        .lastProcessed,

                lastInserted:
                    metadata
                        .lastInserted,

                lastExisting:
                    metadata
                        .lastExisting,

                lastInvalid:
                    metadata
                        .lastInvalid,

                historicalAttributePolicySize:
                    metadata
                        .historicalAttributePolicySize,
            },
            {
                depth: null,
            }
        );


        if (
            metadata
                .historicalAttributePolicySize !==
            113
        ) {
            fail(
                "Persisted SyncState metadata does not record policy size 113."
            );
        }

        pass(
            "SyncState metadata records the 113-attribute policy"
        );


        if (
            metadata.lastReceived !==
                333 ||
            metadata.lastAllowed !==
                59 ||
            metadata.lastPolicyRejected !==
                274 ||
            metadata.lastMissingAttributeId !==
                0 ||
            metadata.lastCheckpointFiltered !==
                28 ||
            metadata.lastProcessed !==
                31
        ) {
            fail(
                "Persisted SyncState accounting does not match the controlled runtime result."
            );
        }

        pass(
            "persisted policy/checkpoint accounting matches the controlled runtime result"
        );


        console.log("");
        console.log(
            "============================================================"
        );
        console.log(
            `READ-ONLY CONTROLLED-RUN VERIFICATION PASSED — ${checks} CHECKS`
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
        "READ-ONLY CONTROLLED-RUN VERIFICATION FAILED"
    );

    console.error(
        error instanceof Error
            ? error.stack
            : error
    );

    process.exitCode =
        1;
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
