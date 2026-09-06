import {
    Installation,
} from "../../models/index.js";

import env from "../../config/env.js";

import {
    syncDevicesForInstallation,
} from "../sync/deviceSyncService.js";

import {
    syncTelemetryByVrmSiteId,
} from "../sync/telemetrySyncService.js";

import {
    syncAlarmRulesByVrmSiteId,
} from "../sync/alarmRuleSyncService.js";

import {
    syncStatisticsByVrmSiteId,
} from "../sync/statisticsSyncService.js";

import {
    refreshInstallationStatuses,
} from "../status/refreshInstallationStatuses.js";

import {
    runWithConcurrency,
} from "./syncJobRunner.js";


const TELEMETRY_INTERVAL_MS =
    10 * 60 * 1000;

const STATUS_REFRESH_INTERVAL_MS =
    5 * 60 * 1000;

const ALARM_INTERVAL_MS =
    30 * 60 * 1000;

const STATISTICS_INTERVAL_MS =
    30 * 60 * 1000;

const DEVICE_INTERVAL_MS =
    6 * 60 * 60 * 1000;


/*
|--------------------------------------------------------------------------
| Job locks
|--------------------------------------------------------------------------
|
| Prevent overlapping execution of the same scheduled job.
|
*/

const jobLocks = {
    telemetry: false,
    statusRefresh: false,
    alarms: false,
    statistics: false,
    devices: false,
};


/*
|--------------------------------------------------------------------------
| Eligible VRM installations
|--------------------------------------------------------------------------
*/

const getActiveInstallations =
    async () => {
        const query =
            Installation.find({
                source: "VRM",
                syncEnabled: true,
                status: {
                    $ne: "INACTIVE",
                },
            })
                .select({
                    _id: 1,
                    vrmSiteId: 1,
                    name: 1,
                    status: 1,
                    syncEnabled: 1,
                })
                .sort({
                    vrmSiteId: 1,
                })
                .lean();

        const batchSize =
            Number(
                env.vrm.syncBatchSize
            ) || 0;

        if (batchSize > 0) {
            query.limit(
                batchSize
            );
        }

        return query;
    };


/*
|--------------------------------------------------------------------------
| Generic per-installation job runner
|--------------------------------------------------------------------------
*/

const runInstallationJob =
    async ({
        jobName,
        worker,
        concurrency = 2,
        delayBetweenStartsMs = 500,
    }) => {
        if (
            jobLocks[jobName]
        ) {
            console.warn(
                `[VRM Scheduler] ${jobName} skipped: previous execution still running.`
            );

            return;
        }

        jobLocks[jobName] =
            true;

        const startedAt =
            Date.now();

        try {
            const installations =
                await getActiveInstallations();

            console.log(
                `[VRM Scheduler] Starting ${jobName} job for ${installations.length} installations.`
            );

            const result =
                await runWithConcurrency({
                    items:
                        installations,

                    concurrency,

                    delayBetweenStartsMs,

                    worker:
                        async (
                            installation
                        ) => {
                            const vrmSiteId =
                                String(
                                    installation
                                        .vrmSiteId
                                );

                            try {
                                const syncResult =
                                    await worker(
                                        vrmSiteId,
                                        installation
                                    );

                                console.log(
                                    `[VRM Scheduler] ${jobName} success: ${vrmSiteId}`
                                );

                                return syncResult;
                            } catch (error) {
                                console.error(
                                    `[VRM Scheduler] ${jobName} failed for ${vrmSiteId}: ${error.message}`
                                );

                                throw error;
                            }
                        },
                });

            console.log(
                `[VRM Scheduler] ${jobName} complete. ` +
                `Successful: ${result.successful}, ` +
                `Failed: ${result.failed}, ` +
                `Duration: ${Date.now() - startedAt} ms`
            );

            return result;
        } catch (error) {
            console.error(
                `[VRM Scheduler] ${jobName} job failed: ${error.message}`
            );

            return null;
        } finally {
            jobLocks[jobName] =
                false;
        }
    };


/*
|--------------------------------------------------------------------------
| Telemetry
|--------------------------------------------------------------------------
*/

const runTelemetryJob =
    async () => {
        return runInstallationJob({
            jobName:
                "telemetry",

            concurrency:
                2,

            delayBetweenStartsMs:
                500,

            worker:
                async (
                    vrmSiteId
                ) => {
                    return syncTelemetryByVrmSiteId(
                        vrmSiteId
                    );
                },
        });
    };


/*
|--------------------------------------------------------------------------
| Installation monitoring status refresh
|--------------------------------------------------------------------------
|
| This job does NOT represent electrical outage detection.
|
| It only maintains monitoring freshness state:
|
| ONLINE
| STALE
| OFFLINE
| UNKNOWN
| INACTIVE
|
*/

const runStatusRefreshJob =
    async () => {
        if (
            jobLocks.statusRefresh
        ) {
            console.warn(
                "[VRM Scheduler] status refresh skipped: previous execution still running."
            );

            return;
        }

        jobLocks.statusRefresh =
            true;

        const startedAt =
            Date.now();

        try {
            const result =
                await refreshInstallationStatuses();

            console.log(
                "[VRM Scheduler] Status refresh complete. " +
                `Total: ${result.total}, ` +
                `Updated: ${result.updated}, ` +
                `Unchanged: ${result.unchanged}, ` +
                `ONLINE: ${result.counts.ONLINE}, ` +
                `STALE: ${result.counts.STALE}, ` +
                `OFFLINE: ${result.counts.OFFLINE}, ` +
                `UNKNOWN: ${result.counts.UNKNOWN}, ` +
                `INACTIVE: ${result.counts.INACTIVE}, ` +
                `Duration: ${Date.now() - startedAt} ms`
            );

            return result;
        } catch (error) {
            console.error(
                `[VRM Scheduler] Status refresh failed: ${error.message}`
            );

            return null;
        } finally {
            jobLocks.statusRefresh =
                false;
        }
    };


/*
|--------------------------------------------------------------------------
| Alarm rules
|--------------------------------------------------------------------------
*/

const runAlarmJob =
    async () => {
        return runInstallationJob({
            jobName:
                "alarms",

            concurrency:
                2,

            delayBetweenStartsMs:
                500,

            worker:
                async (
                    vrmSiteId
                ) => {
                    return syncAlarmRulesByVrmSiteId(
                        vrmSiteId
                    );
                },
        });
    };


/*
|--------------------------------------------------------------------------
| Statistics
|--------------------------------------------------------------------------
*/

const runStatisticsJob =
    async () => {
        return runInstallationJob({
            jobName:
                "statistics",

            concurrency:
                2,

            delayBetweenStartsMs:
                500,

            worker:
                async (
                    vrmSiteId
                ) => {
                    return syncStatisticsByVrmSiteId(
                        vrmSiteId,
                        {
                            type:
                                "kwh",

                            interval:
                                "days",
                        }
                    );
                },
        });
    };


/*
|--------------------------------------------------------------------------
| Devices
|--------------------------------------------------------------------------
*/

const runDeviceJob =
    async () => {
        return runInstallationJob({
            jobName:
                "devices",

            concurrency:
                1,

            delayBetweenStartsMs:
                750,

            worker:
                async (
                    vrmSiteId,
                    installation
                ) => {
                    return syncDevicesForInstallation(
                        installation
                    );
                },
        });
    };


/*
|--------------------------------------------------------------------------
| Scheduler lifecycle
|--------------------------------------------------------------------------
*/

const schedulerHandles =
    [];


const startVrmScheduler =
    () => {
        console.log(
            "[VRM Scheduler] Starting."
        );


        /*
        |--------------------------------------------------------------------------
        | Stagger initial execution
        |--------------------------------------------------------------------------
        */

        const telemetryStart =
            setTimeout(
                runTelemetryJob,
                10 * 1000
            );

        const statusRefreshStart =
            setTimeout(
                runStatusRefreshJob,
                30 * 1000
            );

        const alarmStart =
            setTimeout(
                runAlarmJob,
                60 * 1000
            );

        const statisticsStart =
            setTimeout(
                runStatisticsJob,
                120 * 1000
            );

        const deviceStart =
            setTimeout(
                runDeviceJob,
                180 * 1000
            );


        schedulerHandles.push(
            telemetryStart,
            statusRefreshStart,
            alarmStart,
            statisticsStart,
            deviceStart
        );


        /*
        |--------------------------------------------------------------------------
        | Recurring jobs
        |--------------------------------------------------------------------------
        */

        schedulerHandles.push(
            setInterval(
                runTelemetryJob,
                TELEMETRY_INTERVAL_MS
            )
        );

        schedulerHandles.push(
            setInterval(
                runStatusRefreshJob,
                STATUS_REFRESH_INTERVAL_MS
            )
        );

        schedulerHandles.push(
            setInterval(
                runAlarmJob,
                ALARM_INTERVAL_MS
            )
        );

        schedulerHandles.push(
            setInterval(
                runStatisticsJob,
                STATISTICS_INTERVAL_MS
            )
        );

        schedulerHandles.push(
            setInterval(
                runDeviceJob,
                DEVICE_INTERVAL_MS
            )
        );


        console.log(
            "[VRM Scheduler] Scheduled:"
        );

        console.log(
            "  telemetry     : every 10 minutes"
        );

        console.log(
            "  status refresh: every 5 minutes"
        );

        console.log(
            "  alarms        : every 30 minutes"
        );

        console.log(
            "  statistics    : every 30 minutes"
        );

        console.log(
            "  devices       : every 6 hours"
        );

        console.log(
            `[VRM Scheduler] Fleet batch size: ${
                env.vrm.syncBatchSize ||
                "ALL"
            }`
        );
    };


const stopVrmScheduler =
    () => {
        for (
            const handle of
            schedulerHandles
        ) {
            clearTimeout(
                handle
            );

            clearInterval(
                handle
            );
        }

        schedulerHandles.length =
            0;

        console.log(
            "[VRM Scheduler] Stopped."
        );
    };


export {
    startVrmScheduler,
    stopVrmScheduler,
    runTelemetryJob,
    runStatusRefreshJob,
    runAlarmJob,
    runStatisticsJob,
    runDeviceJob,
};