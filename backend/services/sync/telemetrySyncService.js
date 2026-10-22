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

            /*
             * Raw telemetry retention boundary.
             *
             * MongoDB currently expires raw telemetry
             * after seven days.
             *
             * The ingestion path applies the same
             * horizon so an absent, reset, or stale
             * checkpoint cannot reintroduce telemetry
             * that is already outside raw-data
             * retention.
             */
            retentionDays = 7,
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

        if (
            !Number.isFinite(
                retentionDays
            ) ||
            retentionDays <= 0
        ) {
            throw new Error(
                "Telemetry retentionDays must be a positive number."
            );
        }


        /*
        |--------------------------------------------------------------------------
        | Establish synchronization timing boundaries
        |--------------------------------------------------------------------------
        |
        | retentionFloorEpoch is intentionally independent
        | from the telemetry checkpoint.
        |
        | Checkpoint:
        |     controls normal incremental synchronization.
        |
        | Retention floor:
        |     prevents expired raw telemetry from being
        |     reintroduced if checkpoint state is absent,
        |     reset, or unexpectedly stale.
        |
        */

        const startedAt =
            Date.now();

        const attemptAt =
            new Date();

        const retentionSeconds =
            Math.floor(
                retentionDays *
                24 *
                60 *
                60
            );

        const retentionFloorEpoch =
            Math.floor(
                attemptAt.getTime() /
                1000
            ) -
            retentionSeconds;

        const retentionFloorDate =
            new Date(
                retentionFloorEpoch *
                1000
            );


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
            |
            | The current VRM diagnostics wrapper exposes
            | count only.
            |
            | Do not invent unsupported remote start/end
            | parameters here.
            |
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
            | Retention and checkpoint candidate filtering
            |--------------------------------------------------------------------------
            |
            | Two independent lower boundaries exist:
            |
            | 1. retentionFloorEpoch
            |    Hard raw-data lifecycle boundary.
            |
            | 2. minimumEpoch
            |    Incremental checkpoint boundary with
            |    late-arrival overlap.
            |
            | A valid timestamp must satisfy BOTH when
            | a checkpoint exists.
            |
            | Malformed timestamps continue into
            | normalization so invalid accounting remains
            | authoritative.
            |
            */

            let retentionFiltered = 0;

            let checkpointFiltered = 0;

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


                        /*
                         * Hard raw telemetry retention
                         * boundary.
                         *
                         * Never deliberately reinsert
                         * telemetry that MongoDB's TTL
                         * policy considers expired.
                         */
                        if (
                            timestamp <
                            retentionFloorEpoch
                        ) {
                            retentionFiltered +=
                                1;

                            return false;
                        }


                        /*
                         * No checkpoint yet.
                         *
                         * Bootstrap is still bounded by
                         * the retention floor above.
                         */
                        if (
                            minimumEpoch ===
                            null
                        ) {
                            return true;
                        }


                        /*
                         * Normal incremental checkpoint
                         * filtering.
                         */
                        if (
                            timestamp <
                            minimumEpoch
                        ) {
                            checkpointFiltered +=
                                1;

                            return false;
                        }

                        return true;
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
                 * Defense in depth:
                 *
                 * Candidate filtering uses the raw VRM
                 * timestamp because that is the source
                 * representation available before
                 * normalization.
                 *
                 * Re-check the normalized timestamp
                 * against retention before persistence.
                 */

                if (
                    Math.floor(
                        normalizedTimestamp
                            .getTime() /
                        1000
                    ) <
                    retentionFloorEpoch
                ) {
                    retentionFiltered +=
                        1;

                    continue;
                }


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

                    /*
                     * Keep retention and checkpoint
                     * filtering separately observable.
                     *
                     * This makes future scheduler
                     * diagnostics substantially clearer
                     * than combining both into one count.
                     */
                    lastRetentionFiltered:
                        retentionFiltered,

                    lastCheckpointFiltered:
                        checkpointFiltered,

                    lastProcessed:
                        persistedOperations,

                    lastInserted:
                        inserted,

                    lastExisting:
                        existing,

                    lastInvalid:
                        invalid,

                    overlapSeconds,

                    retentionDays,

                    retentionFloor:
                        retentionFloorDate,

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

                retention: {
                    days:
                        retentionDays,

                    floor:
                        retentionFloorDate,

                    filtered:
                        retentionFiltered,
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

                /*
                 * Preserve the existing result field
                 * while giving it its correct meaning:
                 * records rejected specifically by the
                 * checkpoint boundary.
                 */
                checkpointFiltered,

                retentionFiltered,

                processed:
                    persistedOperations,

                inserted,

                existing,

                invalid,

                policy: {
                    historicalAttributeCount:
                        HISTORICAL_TELEMETRY_ATTRIBUTE_IDS
                            .size,

                    retentionDays,

                    retentionFloor:
                        retentionFloorDate,
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