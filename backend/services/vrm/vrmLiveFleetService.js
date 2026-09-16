import env from "../../config/env.js";
import vrmApiClient from "./apiClient.js";
import {
    qualifyLiveSiteMappings,
} from "./vrmLiveSiteQualificationService.js";

import {
    startVrmLiveTelemetry,
    stopVrmLiveTelemetry,
    getVrmLiveTelemetryState,
} from "./vrmLiveTelemetryService.js";

const DEFAULT_STARTUP_CONCURRENCY = 4;
const LIVE_FLEET_STATUSES =
    Object.freeze({
        STARTING:
            "STARTING",

        LIVE:
            "LIVE",

        CONNECTED_AWAITING_DATA:
            "CONNECTED_AWAITING_DATA",

        RECONNECTING:
            "RECONNECTING",

        FAILED:
            "FAILED",

        STOPPING:
            "STOPPING",
    });

const normalizeSiteId = (value) => {
    const normalized =
        String(value ?? "").trim();

    return /^\d+$/.test(normalized)
        ? normalized
        : null;
};

const normalizePortalId = (value) => {
    const normalized =
        String(value ?? "")
            .trim()
            .toLowerCase();

    return /^[0-9a-f]{12}$/.test(
        normalized
    )
        ? normalized
        : null;
};

const normalizeMqttHost = (value) => {
    const normalized =
        String(value ?? "").trim();

    return normalized.length > 0
        ? normalized
        : null;
};

const classifyVrmLiveFleetSite = ({
    storedStatus,
    connected,
    receivedTelemetryCount,
    reconnectScheduled,
    stopping,
} = {}) => {
    /*
     * A startup exception is terminal
     * for this fleet-start operation.
     *
     * The site is not silently promoted
     * into another state merely because
     * no live-service state exists.
     */
    if (
        storedStatus ===
        LIVE_FLEET_STATUSES.FAILED
    ) {
        return LIVE_FLEET_STATUSES.FAILED;
    }

    if (stopping === true) {
        return LIVE_FLEET_STATUSES.STOPPING;
    }

    const receivedCount =
        Math.max(
            0,
            Number(
                receivedTelemetryCount
            ) || 0
        );

    /*
     * LIVE requires parser-approved
     * telemetry in the current MQTT
     * session.
     *
     * full_publish_completed is
     * deliberately irrelevant here.
     */
    if (
        connected === true &&
        receivedCount > 0
    ) {
        return LIVE_FLEET_STATUSES.LIVE;
    }

    if (connected === true) {
        return LIVE_FLEET_STATUSES
            .CONNECTED_AWAITING_DATA;
    }

    if (
        reconnectScheduled === true
    ) {
        return LIVE_FLEET_STATUSES
            .RECONNECTING;
    }

    /*
     * During bounded startup there can
     * briefly be no established MQTT
     * connection and no reconnect timer.
     */
    return LIVE_FLEET_STATUSES.STARTING;
};

const extractInstallations = (
    response
) => {
    if (Array.isArray(response)) {
        return response;
    }

    if (
        Array.isArray(
            response?.records
        )
    ) {
        return response.records;
    }

    if (
        Array.isArray(
            response?.installations
        )
    ) {
        return response.installations;
    }

    if (
        Array.isArray(
            response?.data
        )
    ) {
        return response.data;
    }

    if (
        Array.isArray(
            response?.data?.records
        )
    ) {
        return response.data.records;
    }

    if (
        Array.isArray(
            response?.data?.installations
        )
    ) {
        return response.data.installations;
    }

    return [];
};

const getInstallationSiteId = (
    installation
) =>
    normalizeSiteId(
        installation?.idSite ??
        installation?.idsite ??
        installation?.siteId ??
        installation?.installationId ??
        installation?.id
    );

const getInstallationPortalId = (
    installation
) =>
    normalizePortalId(
        installation?.identifier
    );

const getInstallationMqttHost = (
    installation
) =>
    normalizeMqttHost(
        installation?.mqtt_host ??
        installation?.mqttHost
    );

/*
 * Build the production live-site plan.
 *
 * Important:
 * This function performs discovery and
 * diagnostics qualification only.
 *
 * It does NOT create MQTT connections.
 */
const buildVrmLiveFleetPlan =
    async () => {
        const response =
            await vrmApiClient.get(
                `/users/${env.vrm.userId}/installations`,
                {
                    params: {
                        extended: 1,
                    },
                }
            );

        const installations =
            extractInstallations(
                response
            );

        const qualifiedSites = [];
        const zeroMappingSites = [];
        const discoveryRejectedSites =
            [];
        const errors = [];

        for (
            const installation of
            installations
        ) {
            const vrmSiteId =
                getInstallationSiteId(
                    installation
                );

            if (!vrmSiteId) {
                continue;
            }

            const portalId =
                getInstallationPortalId(
                    installation
                );

            const mqttHost =
                getInstallationMqttHost(
                    installation
                );

            /*
             * Production live MQTT requires
             * both Portal ID and broker
             * discovery metadata.
             */
            if (
                !portalId ||
                !mqttHost
            ) {
                discoveryRejectedSites.push(
                    Object.freeze({
                        vrmSiteId,
                        portalId,
                        mqttHost,
                        reason:
                            "MISSING_LIVE_DISCOVERY_METADATA",
                    })
                );

                continue;
            }

            try {
                const qualification =
                    await qualifyLiveSiteMappings(
                        vrmSiteId
                    );

                const approvedMappingCount =
                    qualification
                        ?.approvedMappingCount ??
                    0;

                if (
                    approvedMappingCount <=
                    0
                ) {
                    zeroMappingSites.push(
                        Object.freeze({
                            vrmSiteId,
                            portalId,
                            mqttHost,
                            approvedMappingCount:
                                0,
                            reason:
                                "NO_EVIDENCE_BACKED_LIVE_MAPPINGS",
                        })
                    );

                    continue;
                }

                qualifiedSites.push(
                    Object.freeze({
                        vrmSiteId,
                        portalId,
                        mqttHost,
                        approvedMappingCount,
                    })
                );
            } catch (error) {
                errors.push(
                    Object.freeze({
                        vrmSiteId,
                        portalId,
                        mqttHost,
                        reason:
                            "QUALIFICATION_FAILED",
                        message:
                            error?.message ??
                            String(error),
                    })
                );
            }
        }

        qualifiedSites.sort(
            (a, b) =>
                Number(a.vrmSiteId) -
                Number(b.vrmSiteId)
        );

        const brokerCounts =
            new Map();

        for (
            const site of
            qualifiedSites
        ) {
            brokerCounts.set(
                site.mqttHost,
                (
                    brokerCounts.get(
                        site.mqttHost
                    ) ?? 0
                ) + 1
            );
        }

        const brokerDistribution =
            [...brokerCounts.entries()]
                .map(
                    ([
                        mqttHost,
                        siteCount,
                    ]) =>
                        Object.freeze({
                            mqttHost,
                            siteCount,
                        })
                )
                .sort(
                    (a, b) =>
                        b.siteCount -
                        a.siteCount ||
                        a.mqttHost.localeCompare(
                            b.mqttHost
                        )
                );

        return Object.freeze({
            installationCount:
                installations.length,

            qualifiedSiteCount:
                qualifiedSites.length,

            zeroMappingSiteCount:
                zeroMappingSites.length,

            discoveryRejectedSiteCount:
                discoveryRejectedSites.length,

            errorCount:
                errors.length,

            distinctBrokerCount:
                brokerDistribution.length,

            startupConcurrency:
                DEFAULT_STARTUP_CONCURRENCY,

            qualifiedSites:
                Object.freeze(
                    [...qualifiedSites]
                ),

            zeroMappingSites:
                Object.freeze(
                    [...zeroMappingSites]
                ),

            discoveryRejectedSites:
                Object.freeze(
                    [
                        ...discoveryRejectedSites,
                    ]
                ),

            errors:
                Object.freeze(
                    [...errors]
                ),

            brokerDistribution:
                Object.freeze(
                    [
                        ...brokerDistribution,
                    ]
                ),
        });
    };

const fleetRuntime = new Map();

const runWithConcurrency = async (
    items,
    concurrency,
    worker
) => {
    const normalizedConcurrency =
        Math.max(
            1,
            Math.floor(
                Number(concurrency) || 1
            )
        );

    let nextIndex = 0;

    const runWorker = async () => {
        while (true) {
            const currentIndex =
                nextIndex;

            nextIndex += 1;

            if (
                currentIndex >=
                items.length
            ) {
                return;
            }

            await worker(
                items[currentIndex],
                currentIndex
            );
        }
    };

    const workerCount =
        Math.min(
            normalizedConcurrency,
            items.length
        );

    await Promise.all(
        Array.from(
            {
                length: workerCount,
            },
            () => runWorker()
        )
    );
};

const normalizeRequestedSiteIds = (
    siteIds
) => {
    if (!Array.isArray(siteIds)) {
        return null;
    }

    const normalized =
        siteIds
            .map(normalizeSiteId)
            .filter(Boolean);

    return [
        ...new Set(normalized),
    ];
};

const startVrmLiveFleet = async ({
    siteIds = null,
    concurrency =
    DEFAULT_STARTUP_CONCURRENCY,
} = {}) => {
    const plan =
        await buildVrmLiveFleetPlan();

    const requestedSiteIds =
        normalizeRequestedSiteIds(
            siteIds
        );

    const requestedSet =
        requestedSiteIds
            ? new Set(
                requestedSiteIds
            )
            : null;

    const selectedSites =
        requestedSet
            ? plan.qualifiedSites.filter(
                (site) =>
                    requestedSet.has(
                        site.vrmSiteId
                    )
            )
            : [
                ...plan.qualifiedSites,
            ];

    const selectedSiteIds =
        new Set(
            selectedSites.map(
                (site) =>
                    site.vrmSiteId
            )
        );

    const rejectedRequestedSites =
        requestedSiteIds
            ? requestedSiteIds.filter(
                (siteId) =>
                    !selectedSiteIds.has(
                        siteId
                    )
            )
            : [];

    const started = [];
    const failed = [];

    await runWithConcurrency(
        selectedSites,
        concurrency,
        async (site) => {
            const vrmSiteId =
                site.vrmSiteId;

            fleetRuntime.set(
                vrmSiteId,
                Object.freeze({
                    vrmSiteId,
                    status:
                        LIVE_FLEET_STATUSES
                            .STARTING,
                    error: null,
                })
            );

            try {
                await startVrmLiveTelemetry(
                    vrmSiteId
                );

                const liveState =
                    getVrmLiveTelemetryState(
                        vrmSiteId
                    );

                const record =
                    Object.freeze({
                        vrmSiteId,
                        status:
                            LIVE_FLEET_STATUSES
                                .CONNECTED_AWAITING_DATA,
                        connected:
                            liveState
                                ?.connected ===
                            true,
                        approvedMappingCount:
                            liveState
                                ?.approvedMappingCount ??
                            site.approvedMappingCount,
                        subscriptionCount:
                            liveState
                                ?.subscriptionCount ??
                            0,
                        mqttHost:
                            site.mqttHost,
                        error: null,
                    });

                fleetRuntime.set(
                    vrmSiteId,
                    record
                );

                started.push(
                    record
                );
            } catch (error) {
                /*
                 * Site failures are isolated.
                 * One failed site must not
                 * abort startup of the
                 * remaining fleet.
                 */
                try {
                    await stopVrmLiveTelemetry(
                        vrmSiteId
                    );
                } catch {
                    // Best-effort cleanup.
                }

                const record =
                    Object.freeze({
                        vrmSiteId,
                        status:
                            LIVE_FLEET_STATUSES
                                .FAILED,
                        connected:
                            false,
                        approvedMappingCount:
                            site.approvedMappingCount,
                        subscriptionCount:
                            0,
                        mqttHost:
                            site.mqttHost,
                        error:
                            error?.message ??
                            String(error),
                    });

                fleetRuntime.set(
                    vrmSiteId,
                    record
                );

                failed.push(
                    record
                );
            }
        }
    );

    started.sort(
        (a, b) =>
            Number(a.vrmSiteId) -
            Number(b.vrmSiteId)
    );

    failed.sort(
        (a, b) =>
            Number(a.vrmSiteId) -
            Number(b.vrmSiteId)
    );

    return Object.freeze({
        requestedSiteCount:
            requestedSiteIds
                ?.length ?? null,

        selectedSiteCount:
            selectedSites.length,

        startedCount:
            started.length,

        failedCount:
            failed.length,

        rejectedRequestedSiteCount:
            rejectedRequestedSites.length,

        concurrency:
            Math.max(
                1,
                Math.floor(
                    Number(
                        concurrency
                    ) || 1
                )
            ),

        started:
            Object.freeze(
                [...started]
            ),

        failed:
            Object.freeze(
                [...failed]
            ),

        rejectedRequestedSites:
            Object.freeze(
                [
                    ...rejectedRequestedSites,
                ]
            ),
    });
};

const stopVrmLiveFleet = async ({
    siteIds = null,
    concurrency =
    DEFAULT_STARTUP_CONCURRENCY,
} = {}) => {
    const requestedSiteIds =
        normalizeRequestedSiteIds(
            siteIds
        );

    const targetSiteIds =
        requestedSiteIds ??
        [...fleetRuntime.keys()];

    const stopped = [];
    const failed = [];

    await runWithConcurrency(
        targetSiteIds,
        concurrency,
        async (vrmSiteId) => {
            try {
                const liveState =
                    getVrmLiveTelemetryState(
                        vrmSiteId
                    );

                if (liveState) {
                    await stopVrmLiveTelemetry(
                        vrmSiteId
                    );
                }

                fleetRuntime.delete(
                    vrmSiteId
                );

                stopped.push(
                    vrmSiteId
                );
            } catch (error) {
                failed.push(
                    Object.freeze({
                        vrmSiteId,
                        error:
                            error?.message ??
                            String(error),
                    })
                );
            }
        }
    );

    stopped.sort(
        (a, b) =>
            Number(a) -
            Number(b)
    );

    return Object.freeze({
        targetSiteCount:
            targetSiteIds.length,

        stoppedCount:
            stopped.length,

        failedCount:
            failed.length,

        stopped:
            Object.freeze(
                [...stopped]
            ),

        failed:
            Object.freeze(
                [...failed]
            ),
    });
};

const getVrmLiveFleetState = () => {
    const sites =
        [...fleetRuntime.values()]
            .map((record) => {
                const liveState =
                    getVrmLiveTelemetryState(
                        record.vrmSiteId
                    );

                const connected =
                    liveState
                        ?.connected ===
                    true;

                const receivedTelemetryCount =
                    liveState
                        ?.receivedTelemetryCount ??
                    0;

                const reconnectScheduled =
                    liveState
                        ?.reconnectScheduled ===
                    true;

                const stopping =
                    liveState
                        ?.stopping ===
                    true;

                const status =
                    classifyVrmLiveFleetSite({
                        storedStatus:
                            record.status,

                        connected,

                        receivedTelemetryCount,

                        reconnectScheduled,

                        stopping,
                    });

                /*
                 * Current parser timestamps
                 * MQTT receipt time.
                 *
                 * Expose that meaning
                 * explicitly to downstream
                 * consumers. Keep the old
                 * alias temporarily for
                 * compatibility with the
                 * existing validators.
                 */
                const lastTelemetryReceivedAt =
                    liveState
                        ?.lastTelemetryAt ??
                    null;

                return Object.freeze({
                    ...record,

                    status,

                    connected,

                    approvedMappingCount:
                        liveState
                            ?.approvedMappingCount ??
                        record.approvedMappingCount ??
                        0,

                    subscriptionCount:
                        liveState
                            ?.subscriptionCount ??
                        record.subscriptionCount ??
                        0,

                    receivedTelemetryCount,

                    lastTelemetryReceivedAt,

                    /*
                     * Compatibility alias.
                     * Remove only after the
                     * frontend/runtime
                     * consumers migrate.
                     */
                    lastTelemetryAt:
                        lastTelemetryReceivedAt,

                    fullPublishCompleted:
                        liveState
                            ?.fullPublishCompleted ===
                        true,

                    reconnectScheduled,

                    reconnectAttempt:
                        liveState
                            ?.reconnectAttempt ??
                        0,

                    lastReconnectDelayMs:
                        liveState
                            ?.lastReconnectDelayMs ??
                        null,

                    stopping,
                });
            })
            .sort(
                (a, b) =>
                    Number(
                        a.vrmSiteId
                    ) -
                    Number(
                        b.vrmSiteId
                    )
            );

    const liveCount =
        sites.filter(
            (site) =>
                site.status ===
                LIVE_FLEET_STATUSES.LIVE
        ).length;

    const awaitingDataCount =
        sites.filter(
            (site) =>
                site.status ===
                LIVE_FLEET_STATUSES
                    .CONNECTED_AWAITING_DATA
        ).length;

    const reconnectingCount =
        sites.filter(
            (site) =>
                site.status ===
                LIVE_FLEET_STATUSES
                    .RECONNECTING
        ).length;

    const failedCount =
        sites.filter(
            (site) =>
                site.status ===
                LIVE_FLEET_STATUSES.FAILED
        ).length;

    const startingCount =
        sites.filter(
            (site) =>
                site.status ===
                LIVE_FLEET_STATUSES.STARTING
        ).length;

    const stoppingCount =
        sites.filter(
            (site) =>
                site.status ===
                LIVE_FLEET_STATUSES.STOPPING
        ).length;

    return Object.freeze({
        siteCount:
            sites.length,

        connectedCount:
            sites.filter(
                (site) =>
                    site.connected ===
                    true
            ).length,

        liveCount,

        awaitingDataCount,

        reconnectingCount,

        failedCount,

        startingCount,

        stoppingCount,

        sites:
            Object.freeze(
                sites
            ),
    });
};

export {
    DEFAULT_STARTUP_CONCURRENCY,
    LIVE_FLEET_STATUSES,
    classifyVrmLiveFleetSite,
    buildVrmLiveFleetPlan,
    startVrmLiveFleet,
    stopVrmLiveFleet,
    getVrmLiveFleetState,
};