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

    for (const device of devices) {
        const key =
            `${device.deviceType}:${device.deviceInstance}`;

        lookup.set(
            key,
            device
        );
    }

    return lookup;
};


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


const syncTelemetryForInstallation =
    async (
        installation,
        options = {}
    ) => {
        const {
            count = 200,

            /*
             * Small overlap protects us from
             * measurements arriving late with a
             * timestamp close to the checkpoint.
             *
             * MongoDB's unique telemetry index
             * still prevents duplicates.
             */
            overlapSeconds = 120,
        } = options;

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
            | Retrieve current VRM diagnostics
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
             * Use an overlap instead of a strict
             * timestamp > checkpoint comparison.
             *
             * Example:
             *
             * checkpoint = 10:00:00
             * overlap    = 120 seconds
             *
             * We reconsider records from 09:58:00.
             *
             * Existing ones are rejected safely by
             * the unique index; genuinely new ones
             * can still be inserted.
             */

            const minimumEpoch =
                checkpointEpoch !== null
                    ? checkpointEpoch -
                    overlapSeconds
                    : null;

            const candidateRecords =
                records.filter(
                    (record) => {
                        const timestamp =
                            Number(
                                record.timestamp
                            );

                        /*
                         * Keep malformed timestamps
                         * in the candidate collection.
                         *
                         * The normalizer/validation
                         * stage will classify them as
                         * invalid.
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
             * Start with the previous checkpoint.
             *
             * This ensures that if the current VRM
             * response contains only overlapping
             * existing records, lastSeenAt does not
             * move artificially to the current time.
             */
            let newestTimestamp =
                checkpointDate
                    ? new Date(
                        checkpointDate
                    )
                    : null;

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

                const normalizedTimestamp =
                    new Date(
                        normalized.timestamp
                    );

                /*
                 * Keep track of the greatest valid
                 * telemetry timestamp successfully
                 * considered.
                 */
                if (
                    !newestTimestamp ||
                    normalizedTimestamp >
                    newestTimestamp
                ) {
                    newestTimestamp =
                        normalizedTimestamp;
                }

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

            const inserted =
                databaseResult
                    ?.upsertedCount ||
                0;

            const existing =
                databaseResult
                    ?.matchedCount ||
                0;

            /*
            |--------------------------------------------------------------------------
            | Advance telemetry checkpoint
            |--------------------------------------------------------------------------
            |
            | Checkpoint advances only after
            | successful telemetry persistence.
            |
            */

            const successfulSyncAt =
                new Date();

            await SyncState.findByIdAndUpdate(
                syncState._id,
                {
                    $set: {
                        lastRecordTimestamp:
                            newestTimestamp,

                        lastSuccessfulSyncAt:
                            successfulSyncAt,

                        status:
                            "SUCCESS",

                        lastError:
                            null,

                        metadata: {
                            lastReceived:
                                records.length,

                            lastCandidates:
                                candidateRecords.length,

                            lastInserted:
                                inserted,

                            lastExisting:
                                existing,

                            lastInvalid:
                                invalid,

                            overlapSeconds,
                        },
                    },

                    $inc: {
                        recordsProcessed:
                            operations.length,
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
            | IMPORTANT:
            |
            | lastSeenAt is derived from the latest
            | valid telemetry timestamp.
            |
            | lastSyncAt represents when ASHMAAN
            | successfully synchronized telemetry.
            |
            | These are intentionally different.
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
             * Only update lastSeenAt when an actual
             * valid telemetry timestamp exists.
             */
            if (newestTimestamp) {
                installationUpdate
                    .lastSeenAt =
                    newestTimestamp;
            }

            /*
             * Persist monitoring freshness.
             *
             * deriveInstallationStatus()
             * preserves INACTIVE status and
             * syncEnabled === false semantics.
             */
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

                candidates:
                    candidateRecords.length,

                filtered:
                    records.length -
                    candidateRecords.length,

                processed:
                    operations.length,

                inserted,

                existing,

                invalid,

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
            | A failed ASHMAAN/VRM synchronization
            | does NOT prove that the physical site
            | is offline.
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


const syncTelemetryByVrmSiteId =
    async (
        vrmSiteId,
        options = {}
    ) => {
        const installation =
            await Installation.findOne({
                vrmSiteId:
                    String(vrmSiteId),
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