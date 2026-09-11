// ============================================================================
// ASHMAAN PHASE 14.6
// Memory / CPU Resource Behavior Baseline
// ============================================================================
//
// Measurement boundary:
//
// controlled telemetry fixture
//        ↓
// production telemetry normalizer
//        ↓
// Node.js process memory / CPU observations
//
// NO:
// - VRM requests
// - MongoDB reads/writes
// - scheduler execution
// - runtime configuration mutation
// - forced garbage collection requirement
// - equipment control
// - automatic dispatch
//
// ============================================================================

import {
    performance,
} from "node:perf_hooks";

import {
    buildControlledTelemetryFixture,
    normalizeTelemetryBatch,
} from "./telemetryIngestionThroughputService.js";


export const PHASE_14_RUNTIME_RESOURCE_BASELINE =
    Object.freeze({
        phase:
            "14.6",

        layer:
            "RUNTIME_RESOURCE_BEHAVIOR",

        category:
            "MEMORY_CPU_BASELINE",

        mode:
            "CONTROLLED_IN_PROCESS_MEASUREMENT",

        defaults:
            Object.freeze({
                recordCount:
                    5_000,

                rounds:
                    3,

                batchSize:
                    250,

                maxRecordCount:
                    10_000,

                maxRounds:
                    5,

                maxBatchSize:
                    1_000,
            }),

        measurements:
            Object.freeze({
                rss:
                    true,

                heapTotal:
                    true,

                heapUsed:
                    true,

                external:
                    true,

                arrayBuffers:
                    true,

                cpuUser:
                    true,

                cpuSystem:
                    true,

                wallClock:
                    true,

                cpuToWallRatio:
                    true,
            }),

        semantics:
            Object.freeze({
                arbitraryMemoryLimitUsed:
                    false,

                arbitraryCpuLimitUsed:
                    false,

                garbageCollectionRequired:
                    false,

                negativeMemoryDeltaIsFailure:
                    false,

                productionNormalizerExecuted:
                    true,

                syntheticFixtureIsProductionEvidence:
                    false,

                missingTelemetryIsZero:
                    false,

                unitInferenceAllowed:
                    false,

                topologyInferenceAllowed:
                    false,
            }),

        boundaries:
            Object.freeze({
                performsVrmRequest:
                    false,

                performsDatabaseRead:
                    false,

                performsDatabaseWrite:
                    false,

                startsProductionScheduler:
                    false,

                changesSchedulerConfiguration:
                    false,

                changesRuntimeConfiguration:
                    false,

                forcesGarbageCollection:
                    false,

                createsUnboundedQueue:
                    false,

                createsUnboundedAllocation:
                    false,

                changesAuthentication:
                    false,

                changesAuthorization:
                    false,

                performsEquipmentControl:
                    false,

                performsAutoDispatch:
                    false,
            }),
    });


function round(
    value,
    digits = 3
) {
    if (
        typeof value !==
            "number" ||
        !Number.isFinite(
            value
        )
    ) {
        return null;
    }

    const factor =
        10 ** digits;

    return (
        Math.round(
            value *
            factor
        ) /
        factor
    );
}


function requirePositiveInteger(
    value,
    name,
    maximum
) {
    if (
        !Number.isInteger(
            value
        ) ||
        value < 1 ||
        value > maximum
    ) {
        throw new RangeError(
            `${name} must be an integer between 1 and ${maximum}.`
        );
    }
}


function toMegabytes(
    bytes
) {
    return round(
        bytes /
        (
            1024 *
            1024
        ),
        6
    );
}


export function captureMemorySnapshot(
    label =
        "snapshot"
) {
    const memory =
        process.memoryUsage();


    return {
        label,

        timestamp:
            new Date()
                .toISOString(),

        bytes: {
            rss:
                memory.rss,

            heapTotal:
                memory.heapTotal,

            heapUsed:
                memory.heapUsed,

            external:
                memory.external,

            arrayBuffers:
                memory.arrayBuffers ??
                0,
        },

        megabytes: {
            rss:
                toMegabytes(
                    memory.rss
                ),

            heapTotal:
                toMegabytes(
                    memory.heapTotal
                ),

            heapUsed:
                toMegabytes(
                    memory.heapUsed
                ),

            external:
                toMegabytes(
                    memory.external
                ),

            arrayBuffers:
                toMegabytes(
                    memory.arrayBuffers ??
                    0
                ),
        },
    };
}


export function calculateMemoryDelta(
    before,
    after
) {
    if (
        !before?.bytes ||
        !after?.bytes
    ) {
        throw new TypeError(
            "before and after memory snapshots are required."
        );
    }


    const keys = [
        "rss",
        "heapTotal",
        "heapUsed",
        "external",
        "arrayBuffers",
    ];


    const bytes =
        {};

    const megabytes =
        {};


    for (
        const key
        of keys
    ) {
        const delta =
            after.bytes[key] -
            before.bytes[key];

        bytes[key] =
            delta;

        megabytes[key] =
            toMegabytes(
                delta
            );
    }


    return {
        bytes,
        megabytes,
    };
}


export function calculatePeakMemory(
    snapshots
) {
    if (
        !Array.isArray(
            snapshots
        ) ||
        snapshots.length ===
            0
    ) {
        throw new TypeError(
            "snapshots must be a non-empty array."
        );
    }


    const keys = [
        "rss",
        "heapTotal",
        "heapUsed",
        "external",
        "arrayBuffers",
    ];


    const peakBytes =
        {};


    const peakMegabytes =
        {};


    for (
        const key
        of keys
    ) {
        peakBytes[key] =
            Math.max(
                ...snapshots.map(
                    (snapshot) =>
                        snapshot.bytes[key]
                )
            );

        peakMegabytes[key] =
            toMegabytes(
                peakBytes[key]
            );
    }


    return {
        bytes:
            peakBytes,

        megabytes:
            peakMegabytes,
    };
}


export function calculateCpuMeasurement({
    cpuUsage,
    wallDurationMs,
} = {}) {
    if (
        !cpuUsage ||
        !Number.isFinite(
            cpuUsage.user
        ) ||
        !Number.isFinite(
            cpuUsage.system
        )
    ) {
        throw new TypeError(
            "valid cpuUsage is required."
        );
    }


    if (
        !Number.isFinite(
            wallDurationMs
        ) ||
        wallDurationMs <= 0
    ) {
        throw new TypeError(
            "wallDurationMs must be finite and positive."
        );
    }


    const totalMicroseconds =
        cpuUsage.user +
        cpuUsage.system;

    const totalMs =
        totalMicroseconds /
        1000;


    return {
        userMicroseconds:
            cpuUsage.user,

        systemMicroseconds:
            cpuUsage.system,

        totalMicroseconds,

        userMs:
            round(
                cpuUsage.user /
                1000
            ),

        systemMs:
            round(
                cpuUsage.system /
                1000
            ),

        totalMs:
            round(
                totalMs
            ),

        wallDurationMs:
            round(
                wallDurationMs
            ),

        cpuToWallRatio:
            round(
                totalMs /
                wallDurationMs,
                6
            ),
    };
}


export function summarizeResourceSnapshots(
    snapshots
) {
    if (
        !Array.isArray(
            snapshots
        ) ||
        snapshots.length ===
            0
    ) {
        throw new TypeError(
            "snapshots must be a non-empty array."
        );
    }


    const first =
        snapshots[0];

    const last =
        snapshots[
            snapshots.length -
            1
        ];


    return {
        count:
            snapshots.length,

        first,

        last,

        delta:
            calculateMemoryDelta(
                first,
                last
            ),

        peak:
            calculatePeakMemory(
                snapshots
            ),
    };
}


export async function runRuntimeResourceBaseline({
    recordCount =
        PHASE_14_RUNTIME_RESOURCE_BASELINE
            .defaults.recordCount,

    rounds =
        PHASE_14_RUNTIME_RESOURCE_BASELINE
            .defaults.rounds,

    batchSize =
        PHASE_14_RUNTIME_RESOURCE_BASELINE
            .defaults.batchSize,
} = {}) {
    requirePositiveInteger(
        recordCount,
        "recordCount",
        PHASE_14_RUNTIME_RESOURCE_BASELINE
            .defaults.maxRecordCount
    );

    requirePositiveInteger(
        rounds,
        "rounds",
        PHASE_14_RUNTIME_RESOURCE_BASELINE
            .defaults.maxRounds
    );

    requirePositiveInteger(
        batchSize,
        "batchSize",
        PHASE_14_RUNTIME_RESOURCE_BASELINE
            .defaults.maxBatchSize
    );


    const fixture =
        buildControlledTelemetryFixture({
            recordCount,
        });


    const installation =
        Object.freeze({
            _id:
                "phase14-6-installation",

            site:
                "phase14-6-site",
        });


    const device =
        Object.freeze({
            _id:
                "phase14-6-device",
        });


    const snapshots =
        [];

    const roundResults =
        [];


    snapshots.push(
        captureMemorySnapshot(
            "BEFORE_WORKLOAD"
        )
    );


    const cpuStart =
        process.cpuUsage();

    const wallStart =
        performance.now();


    let totalNormalized =
        0;


    for (
        let roundNumber = 1;
        roundNumber <= rounds;
        roundNumber += 1
    ) {
        const roundStartedAt =
            performance.now();

        let normalizedThisRound =
            0;


        for (
            let offset = 0;
            offset < fixture.records.length;
            offset += batchSize
        ) {
            const batch =
                fixture.records.slice(
                    offset,
                    offset +
                    batchSize
                );


            const normalized =
                normalizeTelemetryBatch({
                    records:
                        batch,

                    installation,

                    device,
                });


            normalizedThisRound +=
                normalized.length;

            totalNormalized +=
                normalized.length;
        }


        const roundDurationMs =
            performance.now() -
            roundStartedAt;


        const roundSnapshot =
            captureMemorySnapshot(
                `AFTER_ROUND_${roundNumber}`
            );


        snapshots.push(
            roundSnapshot
        );


        roundResults.push({
            round:
                roundNumber,

            normalized:
                normalizedThisRound,

            durationMs:
                round(
                    roundDurationMs
                ),

            memory:
                roundSnapshot,
        });


        await new Promise(
            (resolve) =>
                setImmediate(
                    resolve
                )
        );
    }


    const wallDurationMs =
        performance.now() -
        wallStart;


    const cpuUsage =
        process.cpuUsage(
            cpuStart
        );


    snapshots.push(
        captureMemorySnapshot(
            "AFTER_WORKLOAD"
        )
    );


    const memory =
        summarizeResourceSnapshots(
            snapshots
        );


    const cpu =
        calculateCpuMeasurement({
            cpuUsage,

            wallDurationMs,
        });


    return {
        phase:
            PHASE_14_RUNTIME_RESOURCE_BASELINE
                .phase,

        layer:
            PHASE_14_RUNTIME_RESOURCE_BASELINE
                .layer,

        category:
            PHASE_14_RUNTIME_RESOURCE_BASELINE
                .category,

        mode:
            PHASE_14_RUNTIME_RESOURCE_BASELINE
                .mode,

        configuration: {
            recordCount,

            rounds,

            batchSize,

            maxRecordCount:
                PHASE_14_RUNTIME_RESOURCE_BASELINE
                    .defaults.maxRecordCount,

            maxRounds:
                PHASE_14_RUNTIME_RESOURCE_BASELINE
                    .defaults.maxRounds,

            maxBatchSize:
                PHASE_14_RUNTIME_RESOURCE_BASELINE
                    .defaults.maxBatchSize,
        },

        workload: {
            fixtureRecords:
                fixture.recordCount,

            fixtureDuplicates:
                fixture.duplicateCount,

            totalNormalized,

            productionEvidence:
                false,

            productionNormalizerExecuted:
                true,
        },

        roundResults,

        memory,

        cpu,

        semantics:
            PHASE_14_RUNTIME_RESOURCE_BASELINE
                .semantics,

        boundaries:
            PHASE_14_RUNTIME_RESOURCE_BASELINE
                .boundaries,
    };
}


export default
PHASE_14_RUNTIME_RESOURCE_BASELINE;