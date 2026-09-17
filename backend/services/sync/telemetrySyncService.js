import {
    Device,
    Installation,
    Telemetry,
    SyncState,
} from "../../models/index.js";

import {
    getInstallationTelemetry,
} from "../vrm/telemetryService.js";

import {
    normalizeTelemetryRecord,
} from "./telemetryNormalizer.js";

import {
    deriveInstallationStatus,
} from "../status/installationStatusService.js";

import {
    HISTORICAL_TELEMETRY_ATTRIBUTE_IDS,
    getRecordVrmAttributeId,
    isHistoricalTelemetryAllowed,
} from "./telemetryPersistencePolicy.js";

const extractRecords = (response) => {
    if (
        Array.isArray(response?.records)
    ) {
        return response.records;
    }

    if (
        Array.isArray(
            response?.data?.records
        )
    ) {
        return response.data.records;
    }

    if (
        Array.isArray(response)
    ) {
        return response;
    }

    return [];
};

/*
|--------------------------------------------------------------------------
| Device lookup
|--------------------------------------------------------------------------
*/

const buildDeviceLookup = async (
    installation
) => {
    const devices =
        await Device.find({
            installation:
                installation._id,
        }).lean();

    const lookup =
        new Map();

    for (
        const device
        of devices
    ) {
        const key =
            `${device.deviceType}:${device.deviceInstance}`;

        lookup.set(
            key,
            device
        );
    }

    return lookup;
};


/*
|--------------------------------------------------------------------------
| Telemetry synchronization state
|--------------------------------------------------------------------------
*/

const getTelemetrySyncState = async (
    installation
) => {
    return SyncState.findOneAndUpdate(
        {
            installation:
                installation._id,

            source:
                "VRM",

            syncType:
                "TELEMETRY",
        },
        {
            $setOnInsert: {
                installation:
                    installation._id,

                source:
                    "VRM",

                syncType:
                    "TELEMETRY",

                status:
                    "NEVER_RUN",

                recordsProcessed:
                    0,
            },
        },
        {
            upsert:
                true,

            returnDocument:
                "after",

            runValidators:
                true,
        }
    );
};

/*
|--------------------------------------------------------------------------
| Installation telemetry synchronization
|--------------------------------------------------------------------------
*/

const syncTelemetryForInstallation =
    async (
        installation,
        options = {}
    ) => {
        const {
            count = 200,

            /*
             * Small overlap protects against
             * measurements arriving late around
             * the previous checkpoint.
             *
             * MongoDB's unique telemetry identity
             * prevents duplicate persistence.
             */
            overlapSeconds = 120,
        } = options;


        /*
        |--------------------------------------------------------------------------
        | Validate synchronization options
        |--------------------------------------------------------------------------
        */

        if (
            !Number.isInteger(
                count
            ) ||
            count <= 0
        ) {
            throw new Error(
                "Telemetry sync count must be a positive integer."
            );
        }

        if (
            !Number.isFinite(
                overlapSeconds
            ) ||
            overlapSeconds < 0
        ) {
            throw new Error(
                "Telemetry overlapSeconds must be a non-negative number."
            );
        }


        const startedAt =
            Date.now();

        const attemptAt =
            new Date();

        const syncState =
            await getTelemetrySyncState(
                installation
            );


        /*
        |--------------------------------------------------------------------------
        | Record synchronization attempt
        |--------------------------------------------------------------------------
        */

        await SyncState.updateOne(
            {
                _id:
                    syncState._id,
            },
            {
                $set: {
                    lastAttemptAt:
                        attemptAt,
                },
            }
        );


        try {
            /*
            |--------------------------------------------------------------------------
            | Retrieve VRM diagnostics
            |--------------------------------------------------------------------------
            */

            const fetchStartedAt =
                Date.now();

            const response =
                await getInstallationTelemetry(
                    installation.vrmSiteId,
                    {
                        count,
                    }
                );

            const vrmFetchMs =
                Date.now() -
                fetchStartedAt;

            const records =
                extractRecords(
                    response
                );


            /*
            |--------------------------------------------------------------------------
            | Apply ASHMAAN historical persistence policy
            |--------------------------------------------------------------------------
            |
            | Filtering happens BEFORE checkpoint filtering.
            |
            | This prevents unrelated VRM diagnostics from:
            |
            | - entering MongoDB;
            | - influencing the engineering telemetry checkpoint;
            | - inflating recordsProcessed;
            | - appearing to represent ASHMAAN telemetry coverage.
            |
            */

            const allowedRecords = [];

            let policyRejected = 0;

            let missingAttributeId = 0;

            for (
                const record
                of records
            ) {
                const vrmAttributeId =
                    getRecordVrmAttributeId(
                        record
                    );

                if (
                    vrmAttributeId ===
                    null
                ) {
                    missingAttributeId +=
                        1;

                    policyRejected +=
                        1;

                    continue;
                }

                if (
                    !isHistoricalTelemetryAllowed(
                        record
                    )
                ) {
                    policyRejected +=
                        1;

                    continue;
                }

                allowedRecords.push(
                    record
                );
            }


            /*
            |--------------------------------------------------------------------------
            | Determine local checkpoint
            |--------------------------------------------------------------------------
            */

            const checkpointDate =
                syncState
                    .lastRecordTimestamp
                    ? new Date(
                        syncState
                            .lastRecordTimestamp
                    )
                    : null;

            let checkpointEpoch =
                null;

            if (
                checkpointDate &&
                !Number.isNaN(
                    checkpointDate
                        .getTime()
                )
            ) {
                checkpointEpoch =
                    Math.floor(
                        checkpointDate
                            .getTime() /
                        1000
                    );
            }


            /*
             * Use overlap rather than a strict
             * timestamp > checkpoint comparison.
             *
             * Example:
             *
             * checkpoint = 10:00:00
             * overlap    = 120 seconds
             *
             * Reconsider from 09:58:00.
             *
             * Existing records match the unique
             * telemetry identity and are therefore
             * not duplicated.
             */

            const minimumEpoch =
                checkpointEpoch !== null
                    ? checkpointEpoch -
                    overlapSeconds
                    : null;


            /*
            |--------------------------------------------------------------------------
            | Checkpoint candidate filtering
            |--------------------------------------------------------------------------
            */

            const candidateRecords =
                allowedRecords.filter(
                    (record) => {
                        const timestamp =
                            Number(
                                record.timestamp
                            );

                        /*
                         * Preserve malformed timestamps
                         * until normalization/validation
                         * so they are counted correctly
                         * as invalid.
                         */
                        if (
                            !Number.isFinite(
                                timestamp
                            ) ||
                            timestamp <= 0
                        ) {
                            return true;
                        }

                        if (
                            minimumEpoch ===
                            null
                        ) {
                            return true;
                        }

                        return (
                            timestamp >=
                            minimumEpoch
                        );
                    }
                );


            /*
            |--------------------------------------------------------------------------
            | Device association
            |--------------------------------------------------------------------------
            */

            const deviceLookup =
                await buildDeviceLookup(
                    installation
                );

            const operations = [];

            let invalid = 0;

            /*
             * Start from the previous checkpoint.
             *
             * The checkpoint is advanced only by
             * valid, policy-approved telemetry.
             */
            let newestTimestamp =
                checkpointDate
                    ? new Date(
                        checkpointDate
                    )
                    : null;


            /*
            |--------------------------------------------------------------------------
            | Normalize and prepare persistence operations
            |--------------------------------------------------------------------------
            */

            for (
                const record
                of candidateRecords
            ) {
                const deviceKey =
                    `${record.Device}:${record.instance}`;

                const device =
                    deviceLookup.get(
                        deviceKey
                    ) || null;

                const normalized =
                    normalizeTelemetryRecord(
                        {
                            record,
                            installation,
                            device,
                        }
                    );


                /*
                 * Normalization remains authoritative
                 * for telemetry semantics.
                 *
                 * Missing values are NOT converted to
                 * zero here.
                 */

                if (
                    !normalized.timestamp ||
                    Number.isNaN(
                        new Date(
                            normalized.timestamp
                        ).getTime()
                    ) ||
                    !Number.isFinite(
                        normalized
                            .vrmAttributeId
                    )
                ) {
                    invalid += 1;

                    continue;
                }


                /*
                 * Defense in depth:
                 *
                 * The normalized attribute ID must
                 * still belong to the historical
                 * persistence policy.
                 */

                if (
                    !HISTORICAL_TELEMETRY_ATTRIBUTE_IDS
                        .has(
                            Number(
                                normalized
                                    .vrmAttributeId
                            )
                        )
                ) {
                    policyRejected +=
                        1;

                    continue;
                }


                const normalizedTimestamp =
                    new Date(
                        normalized.timestamp
                    );


                /*
                 * Track greatest valid,
                 * policy-approved telemetry timestamp.
                 */

                if (
                    !newestTimestamp ||
                    normalizedTimestamp >
                    newestTimestamp
                ) {
                    newestTimestamp =
                        normalizedTimestamp;
                }


                /*
                 * Preserve existing telemetry identity.
                 *
                 * DO NOT weaken this identity.
                 */

                operations.push({
                    updateOne: {
                        filter: {
                            installation:
                                installation._id,

                            deviceType:
                                normalized
                                    .deviceType,

                            deviceInstance:
                                normalized
                                    .deviceInstance,

                            vrmAttributeId:
                                normalized
                                    .vrmAttributeId,

                            timestamp:
                                normalizedTimestamp,
                        },

                        update: {
                            $setOnInsert: {
                                ...normalized,

                                timestamp:
                                    normalizedTimestamp,
                            },
                        },

                        upsert:
                            true,
                    },
                });
            }


            /*
            |--------------------------------------------------------------------------
            | Bulk persistence
            |--------------------------------------------------------------------------
            */

            const databaseStartedAt =
                Date.now();

            let databaseResult =
                null;

            if (
                operations.length > 0
            ) {
                databaseResult =
                    await Telemetry.bulkWrite(
                        operations,
                        {
                            ordered:
                                false,
                        }
                    );
            }

            const databaseMs =
                Date.now() -
                databaseStartedAt;


            /*
            |--------------------------------------------------------------------------
            | Persistence accounting
            |--------------------------------------------------------------------------
            */

            const inserted =
                databaseResult
                    ?.upsertedCount ??
                0;

            const existing =
                databaseResult
                    ?.matchedCount ??
                0;

            const persistedOperations =
                operations.length;


            /*
            |--------------------------------------------------------------------------
            | Advance telemetry checkpoint
            |--------------------------------------------------------------------------
            |
            | Checkpoint advances only after successful
            | persistence.
            |
            | It is based only on valid,
            | policy-approved telemetry.
            |
            */

            const successfulSyncAt =
                new Date();


            const syncStateSet = {
                lastSuccessfulSyncAt:
                    successfulSyncAt,

                status:
                    "SUCCESS",

                lastError:
                    null,

                metadata: {
                    lastReceived:
                        records.length,

                    lastAllowed:
                        allowedRecords.length,

                    lastPolicyRejected:
                        policyRejected,

                    lastMissingAttributeId:
                        missingAttributeId,

                    lastCandidates:
                        candidateRecords.length,

                    lastCheckpointFiltered:
                        allowedRecords.length -
                        candidateRecords.length,

                    lastProcessed:
                        persistedOperations,

                    lastInserted:
                        inserted,

                    lastExisting:
                        existing,

                    lastInvalid:
                        invalid,

                    overlapSeconds,

                    historicalAttributePolicySize:
                        HISTORICAL_TELEMETRY_ATTRIBUTE_IDS
                            .size,
                },
            };


            /*
             * Do not write a null checkpoint for an
             * installation that has never produced a
             * valid policy-approved telemetry record.
             */

            if (newestTimestamp) {
                syncStateSet
                    .lastRecordTimestamp =
                    newestTimestamp;
            }


            await SyncState.findByIdAndUpdate(
                syncState._id,
                {
                    $set:
                        syncStateSet,

                    /*
                     * recordsProcessed means valid
                     * telemetry operations submitted
                     * successfully to MongoDB.
                     *
                     * It does NOT mean newly inserted
                     * documents.
                     *
                     * Insert/match accounting is kept
                     * separately in metadata.
                     */
                    $inc: {
                        recordsProcessed:
                            persistedOperations,
                    },
                },
                {
                    returnDocument:
                        "after",
                }
            );


            /*
            |--------------------------------------------------------------------------
            | Derive installation monitoring status
            |--------------------------------------------------------------------------
            |
            | lastSeenAt:
            |     latest valid policy-approved
            |     telemetry timestamp.
            |
            | lastSyncAt:
            |     time ASHMAAN successfully completed
            |     the synchronization.
            |
            | These concepts remain intentionally
            | separate.
            |
            */

            const derivedStatus =
                deriveInstallationStatus({
                    lastSeenAt:
                        newestTimestamp,

                    syncEnabled:
                        installation
                            .syncEnabled,

                    persistedStatus:
                        installation
                            .status,

                    now:
                        successfulSyncAt,
                });


            const installationUpdate = {
                lastSyncAt:
                    successfulSyncAt,

                status:
                    derivedStatus.status,
            };


            /*
             * Only update lastSeenAt when actual
             * valid policy-approved telemetry exists.
             */

            if (newestTimestamp) {
                installationUpdate
                    .lastSeenAt =
                    newestTimestamp;
            }


            await Installation.updateOne(
                {
                    _id:
                        installation._id,
                },
                {
                    $set:
                        installationUpdate,
                }
            );


            /*
            |--------------------------------------------------------------------------
            | Result
            |--------------------------------------------------------------------------
            */

            return {
                vrmSiteId:
                    installation.vrmSiteId,

                checkpoint: {
                    previous:
                        checkpointDate,

                    current:
                        newestTimestamp,

                    overlapSeconds,
                },

                installationStatus: {
                    status:
                        derivedStatus.status,

                    lastSeenAt:
                        newestTimestamp,

                    lastSyncAt:
                        successfulSyncAt,

                    ageMinutes:
                        derivedStatus
                            .ageMinutes,
                },

                received:
                    records.length,

                allowed:
                    allowedRecords.length,

                policyRejected,

                missingAttributeId,

                candidates:
                    candidateRecords.length,

                checkpointFiltered:
                    allowedRecords.length -
                    candidateRecords.length,

                processed:
                    persistedOperations,

                inserted,

                existing,

                invalid,

                policy: {
                    historicalAttributeCount:
                        HISTORICAL_TELEMETRY_ATTRIBUTE_IDS
                            .size,
                },

                performance: {
                    vrmFetchMs,

                    databaseMs,

                    totalMs:
                        Date.now() -
                        startedAt,
                },
            };
        } catch (error) {
            /*
            |--------------------------------------------------------------------------
            | Failure handling
            |--------------------------------------------------------------------------
            |
            | Synchronization failure does NOT prove
            | that the physical installation is
            | offline.
            |
            | Therefore:
            |
            | - checkpoint is not advanced
            | - lastSeenAt is not modified
            | - Installation.status is not forced
            |   to OFFLINE
            |
            */

            await SyncState.findByIdAndUpdate(
                syncState._id,
                {
                    $set: {
                        status:
                            "FAILED",

                        lastError:
                            error.message,

                        lastAttemptAt:
                            attemptAt,
                    },
                }
            );

            throw error;
        }
    };


/*
|--------------------------------------------------------------------------
| Synchronize by VRM site ID
|--------------------------------------------------------------------------
*/

const syncTelemetryByVrmSiteId =
    async (
        vrmSiteId,
        options = {}
    ) => {
        const installation =
            await Installation.findOne({
                vrmSiteId:
                    String(
                        vrmSiteId
                    ),
            });

        if (!installation) {
            throw new Error(
                `Installation ${vrmSiteId} was not found.`
            );
        }

        return syncTelemetryForInstallation(
            installation,
            options
        );
    };


export {
    syncTelemetryForInstallation,
    syncTelemetryByVrmSiteId,
};
