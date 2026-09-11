// ============================================================================
// ASHMAAN PHASE 14.6
// Memory / CPU Resource Behavior Validation
// ============================================================================

import assert from "node:assert/strict";
import fs from "node:fs";

import runtimeResourceContract, {
    captureMemorySnapshot,
    calculateMemoryDelta,
    calculatePeakMemory,
    calculateCpuMeasurement,
    runRuntimeResourceBaseline,
} from "../services/performance/runtimeResourceBaselineService.js";


let assertionsPassed =
    0;


function check(
    condition,
    message
) {
    assert.ok(
        condition,
        message
    );

    assertionsPassed +=
        1;

    console.log(
        `PASS ${assertionsPassed}: ${message}`
    );
}


function section(
    title
) {
    console.log("");
    console.log(
        `--- ${title} ---`
    );
}


function finiteNonNegative(
    value
) {
    return (
        Number.isFinite(
            value
        ) &&
        value >= 0
    );
}


console.log("");
console.log(
    "=".repeat(
        76
    )
);

console.log(
    "ASHMAAN PHASE 14.6 — MEMORY / CPU RESOURCE BEHAVIOR VALIDATION"
);

console.log(
    "=".repeat(
        76
    )
);


try {

    // ========================================================================
    // A. Contract identity
    // ========================================================================

    section(
        "A. Phase identity and contract"
    );


    check(
        runtimeResourceContract
            .phase ===
            "14.6",
        "phase identity is 14.6"
    );


    check(
        runtimeResourceContract
            .layer ===
            "RUNTIME_RESOURCE_BEHAVIOR",
        "layer identifies runtime resource behavior"
    );


    check(
        runtimeResourceContract
            .category ===
            "MEMORY_CPU_BASELINE",
        "category identifies memory / CPU baseline"
    );


    check(
        runtimeResourceContract
            .mode ===
            "CONTROLLED_IN_PROCESS_MEASUREMENT",
        "measurement is controlled and in-process"
    );


    check(
        Object.isFrozen(
            runtimeResourceContract
        ),
        "Phase 14.6 contract is frozen"
    );


    // ========================================================================
    // B. Bounded defaults
    // ========================================================================

    section(
        "B. Bounded resource measurement defaults"
    );


    const defaults =
        runtimeResourceContract
            .defaults;


    check(
        defaults.recordCount ===
            5_000,
        "default workload contains 5000 records"
    );


    check(
        defaults.rounds ===
            3,
        "default workload uses three rounds"
    );


    check(
        defaults.batchSize ===
            250,
        "default batch size remains 250"
    );


    check(
        defaults.maxRecordCount ===
            10_000,
        "record count has explicit upper bound"
    );


    check(
        defaults.maxRounds ===
            5,
        "measurement rounds have explicit upper bound"
    );


    check(
        defaults.maxBatchSize ===
            1_000,
        "batch size has explicit upper bound"
    );


    // ========================================================================
    // C. Resource dimensions
    // ========================================================================

    section(
        "C. Required resource measurements"
    );


    const measurements =
        runtimeResourceContract
            .measurements;


    for (
        const [
            key,
            enabled,
        ]
        of Object.entries(
            measurements
        )
    ) {
        check(
            enabled ===
                true,
            `${key} measurement is enabled`
        );
    }


    // ========================================================================
    // D. Semantic boundaries
    // ========================================================================

    section(
        "D. Measurement semantics"
    );


    const semantics =
        runtimeResourceContract
            .semantics;


    check(
        semantics
            .arbitraryMemoryLimitUsed ===
            false,
        "no arbitrary memory failure threshold is introduced"
    );


    check(
        semantics
            .arbitraryCpuLimitUsed ===
            false,
        "no arbitrary CPU failure threshold is introduced"
    );


    check(
        semantics
            .garbageCollectionRequired ===
            false,
        "validation does not require forced garbage collection"
    );


    check(
        semantics
            .negativeMemoryDeltaIsFailure ===
            false,
        "negative memory delta is not automatically a failure"
    );


    check(
        semantics
            .productionNormalizerExecuted ===
            true,
        "resource workload uses the production telemetry normalizer"
    );


    check(
        semantics
            .syntheticFixtureIsProductionEvidence ===
            false,
        "controlled fixture is not represented as production evidence"
    );


    check(
        semantics
            .missingTelemetryIsZero ===
            false,
        "missing telemetry remains distinct from zero"
    );


    check(
        semantics
            .unitInferenceAllowed ===
            false,
        "resource measurement does not infer units"
    );


    check(
        semantics
            .topologyInferenceAllowed ===
            false,
        "resource measurement does not infer topology"
    );


    // ========================================================================
    // E. Safety boundary
    // ========================================================================

    section(
        "E. Runtime resource safety boundary"
    );


    const boundaries =
        runtimeResourceContract
            .boundaries;


    for (
        const [
            key,
            value,
        ]
        of Object.entries(
            boundaries
        )
    ) {
        check(
            value ===
                false,
            `${key} remains disabled`
        );
    }


    // ========================================================================
    // F. Production-normalizer source evidence
    // ========================================================================

    section(
        "F. Production-normalizer source evidence"
    );


    const normalizerPath =
        new URL(
            "../services/sync/telemetryNormalizer.js",
            import.meta.url
        );


    const phase14FourPath =
        new URL(
            "../services/performance/telemetryIngestionThroughputService.js",
            import.meta.url
        );


    check(
        fs.existsSync(
            normalizerPath
        ),
        "production telemetry normalizer exists"
    );


    check(
        fs.existsSync(
            phase14FourPath
        ),
        "Phase 14.4 controlled normalizer harness exists"
    );


    const phase14FourSource =
        fs.readFileSync(
            phase14FourPath,
            "utf8"
        );


    check(
        /normalizeTelemetryRecord/.test(
            phase14FourSource
        ),
        "Phase 14.4 harness remains connected to production normalizer"
    );


    check(
        /normalizeTelemetryBatch/.test(
            phase14FourSource
        ),
        "bounded telemetry normalization helper remains available"
    );


    // ========================================================================
    // G. Raw memory snapshot behavior
    // ========================================================================

    section(
        "G. Node.js process memory snapshot"
    );


    const snapshot =
        captureMemorySnapshot(
            "VALIDATOR_SNAPSHOT"
        );


    check(
        snapshot.label ===
            "VALIDATOR_SNAPSHOT",
        "memory snapshot preserves explicit label"
    );


    check(
        typeof snapshot.timestamp ===
            "string" &&
        snapshot.timestamp.length >
            0,
        "memory snapshot includes timestamp"
    );


    for (
        const key
        of [
            "rss",
            "heapTotal",
            "heapUsed",
            "external",
            "arrayBuffers",
        ]
    ) {
        check(
            finiteNonNegative(
                snapshot
                    .bytes[key]
            ),
            `${key} byte measurement is finite and non-negative`
        );


        check(
            finiteNonNegative(
                snapshot
                    .megabytes[key]
            ),
            `${key} megabyte measurement is finite and non-negative`
        );
    }


    check(
        snapshot
            .bytes
            .heapUsed <=
        snapshot
            .bytes
            .heapTotal,
        "heap used does not exceed reported heap total"
    );


    // ========================================================================
    // H. Memory delta behavior
    // ========================================================================

    section(
        "H. Memory delta calculation"
    );


    const delta =
        calculateMemoryDelta(
            {
                bytes: {
                    rss:
                        1000,

                    heapTotal:
                        800,

                    heapUsed:
                        500,

                    external:
                        200,

                    arrayBuffers:
                        100,
                },
            },
            {
                bytes: {
                    rss:
                        1300,

                    heapTotal:
                        900,

                    heapUsed:
                        450,

                    external:
                        250,

                    arrayBuffers:
                        120,
                },
            }
        );


    check(
        delta.bytes.rss ===
            300,
        "memory delta calculates positive RSS change"
    );


    check(
        delta.bytes.heapTotal ===
            100,
        "memory delta calculates heap-total change"
    );


    check(
        delta.bytes.heapUsed ===
            -50,
        "memory delta preserves negative heap-used change"
    );


    check(
        delta.bytes.external ===
            50,
        "memory delta calculates external-memory change"
    );


    check(
        delta.bytes.arrayBuffers ===
            20,
        "memory delta calculates ArrayBuffer change"
    );


    // ========================================================================
    // I. Peak memory behavior
    // ========================================================================

    section(
        "I. Peak memory calculation"
    );


    const peak =
        calculatePeakMemory([
            {
                bytes: {
                    rss:
                        100,

                    heapTotal:
                        80,

                    heapUsed:
                        50,

                    external:
                        20,

                    arrayBuffers:
                        10,
                },
            },
            {
                bytes: {
                    rss:
                        150,

                    heapTotal:
                        90,

                    heapUsed:
                        70,

                    external:
                        25,

                    arrayBuffers:
                        12,
                },
            },
            {
                bytes: {
                    rss:
                        120,

                    heapTotal:
                        85,

                    heapUsed:
                        60,

                    external:
                        22,

                    arrayBuffers:
                        11,
                },
            },
        ]);


    check(
        peak.bytes.rss ===
            150,
        "peak calculator preserves maximum RSS"
    );


    check(
        peak.bytes.heapTotal ===
            90,
        "peak calculator preserves maximum heap total"
    );


    check(
        peak.bytes.heapUsed ===
            70,
        "peak calculator preserves maximum heap used"
    );


    check(
        peak.bytes.external ===
            25,
        "peak calculator preserves maximum external memory"
    );


    check(
        peak.bytes.arrayBuffers ===
            12,
        "peak calculator preserves maximum ArrayBuffer memory"
    );


    // ========================================================================
    // J. CPU calculation
    // ========================================================================

    section(
        "J. CPU measurement calculation"
    );


    const cpuFixture =
        calculateCpuMeasurement({
            cpuUsage: {
                user:
                    8_000,

                system:
                    2_000,
            },

            wallDurationMs:
                20,
        });


    check(
        cpuFixture
            .totalMicroseconds ===
            10_000,
        "CPU calculation sums user and system CPU time"
    );


    check(
        cpuFixture
            .userMs ===
            8,
        "CPU calculation converts user time to milliseconds"
    );


    check(
        cpuFixture
            .systemMs ===
            2,
        "CPU calculation converts system time to milliseconds"
    );


    check(
        cpuFixture
            .totalMs ===
            10,
        "CPU calculation reports total CPU milliseconds"
    );


    check(
        cpuFixture
            .cpuToWallRatio ===
            0.5,
        "CPU-to-wall ratio is calculated without threshold judgment"
    );


    // ========================================================================
    // K. Controlled live-process baseline
    // ========================================================================

    section(
        "K. Controlled runtime resource baseline"
    );


    const baseline =
        await runRuntimeResourceBaseline({
            recordCount:
                5_000,

            rounds:
                3,

            batchSize:
                250,
        });


    check(
        baseline.phase ===
            "14.6",
        "runtime baseline identifies Phase 14.6"
    );


    check(
        baseline.layer ===
            "RUNTIME_RESOURCE_BEHAVIOR",
        "runtime baseline identifies resource-behavior layer"
    );


    check(
        baseline.category ===
            "MEMORY_CPU_BASELINE",
        "runtime baseline identifies memory / CPU category"
    );


    check(
        baseline.mode ===
            "CONTROLLED_IN_PROCESS_MEASUREMENT",
        "runtime baseline remains controlled in-process measurement"
    );


    check(
        baseline
            .configuration
            .recordCount ===
            5_000,
        "runtime baseline uses 5000 records"
    );


    check(
        baseline
            .configuration
            .rounds ===
            3,
        "runtime baseline uses three rounds"
    );


    check(
        baseline
            .configuration
            .batchSize ===
            250,
        "runtime baseline uses bounded batch size 250"
    );


    check(
        baseline
            .workload
            .totalNormalized ===
            15_000,
        "runtime baseline performs exactly 15000 normalization operations"
    );


    check(
        baseline
            .workload
            .productionEvidence ===
            false,
        "controlled resource workload is not represented as live production evidence"
    );


    check(
        baseline
            .workload
            .productionNormalizerExecuted ===
            true,
        "production normalizer executes in resource baseline"
    );


    check(
        baseline
            .roundResults
            .length ===
            3,
        "runtime baseline returns exactly three round results"
    );


    // ========================================================================
    // L. Per-round evidence
    // ========================================================================

    section(
        "L. Per-round resource behavior"
    );


    for (
        const round
        of baseline.roundResults
    ) {
        check(
            round.normalized ===
                5_000,
            `round ${round.round} normalized exactly 5000 records`
        );


        check(
            Number.isFinite(
                round.durationMs
            ) &&
            round.durationMs >
                0,
            `round ${round.round} duration is finite and positive`
        );


        check(
            finiteNonNegative(
                round
                    .memory
                    .bytes
                    .rss
            ),
            `round ${round.round} reports finite RSS`
        );


        check(
            finiteNonNegative(
                round
                    .memory
                    .bytes
                    .heapUsed
            ),
            `round ${round.round} reports finite heap usage`
        );
    }


    // ========================================================================
    // M. Aggregate memory evidence
    // ========================================================================

    section(
        "M. Aggregate memory evidence"
    );


    check(
        baseline
            .memory
            .count ===
            5,
        "memory baseline contains before, three rounds, and after snapshots"
    );


    for (
        const key
        of [
            "rss",
            "heapTotal",
            "heapUsed",
            "external",
            "arrayBuffers",
        ]
    ) {
        check(
            finiteNonNegative(
                baseline
                    .memory
                    .peak
                    .bytes[key]
            ),
            `peak ${key} is finite and non-negative`
        );


        check(
            baseline
                .memory
                .peak
                .bytes[key] >=
            baseline
                .memory
                .first
                .bytes[key],
            `peak ${key} is not below initial observation`
        );


        check(
            Number.isFinite(
                baseline
                    .memory
                    .delta
                    .bytes[key]
            ),
            `${key} final delta is finite`
        );
    }


    // ========================================================================
    // N. Aggregate CPU evidence
    // ========================================================================

    section(
        "N. Aggregate CPU evidence"
    );


    check(
        finiteNonNegative(
            baseline
                .cpu
                .userMicroseconds
        ),
        "user CPU time is finite and non-negative"
    );


    check(
        finiteNonNegative(
            baseline
                .cpu
                .systemMicroseconds
        ),
        "system CPU time is finite and non-negative"
    );


    check(
        baseline
            .cpu
            .totalMicroseconds ===
        (
            baseline
                .cpu
                .userMicroseconds +
            baseline
                .cpu
                .systemMicroseconds
        ),
        "total CPU time reconciles user plus system time"
    );


    check(
        Number.isFinite(
            baseline
                .cpu
                .totalMs
        ) &&
        baseline
            .cpu
            .totalMs >
            0,
        "total CPU milliseconds are finite and positive"
    );


    check(
        Number.isFinite(
            baseline
                .cpu
                .wallDurationMs
        ) &&
        baseline
            .cpu
            .wallDurationMs >
            0,
        "wall-clock duration is finite and positive"
    );


    check(
        Number.isFinite(
            baseline
                .cpu
                .cpuToWallRatio
        ) &&
        baseline
            .cpu
            .cpuToWallRatio >=
            0,
        "CPU-to-wall ratio is finite and non-negative"
    );


    // ========================================================================
    // O. Final safety confirmation
    // ========================================================================

    section(
        "O. Final runtime-resource safety confirmation"
    );


    check(
        baseline
            .boundaries
            .performsVrmRequest ===
            false,
        "resource baseline performs no VRM request"
    );


    check(
        baseline
            .boundaries
            .performsDatabaseRead ===
            false,
        "resource baseline performs no database read"
    );


    check(
        baseline
            .boundaries
            .performsDatabaseWrite ===
            false,
        "resource baseline performs no database write"
    );


    check(
        baseline
            .boundaries
            .startsProductionScheduler ===
            false,
        "resource baseline does not start production scheduler"
    );


    check(
        baseline
            .boundaries
            .forcesGarbageCollection ===
            false,
        "resource baseline does not force garbage collection"
    );


    check(
        baseline
            .boundaries
            .createsUnboundedQueue ===
            false,
        "resource baseline creates no unbounded queue"
    );


    check(
        baseline
            .boundaries
            .createsUnboundedAllocation ===
            false,
        "resource baseline creates no unbounded allocation"
    );


    check(
        baseline
            .boundaries
            .performsEquipmentControl ===
            false,
        "resource baseline performs no equipment control"
    );


    check(
        baseline
            .boundaries
            .performsAutoDispatch ===
            false,
        "resource baseline performs no automatic dispatch"
    );


    // ========================================================================
    // P. Report
    // ========================================================================

    section(
        "P. Measured memory / CPU baseline"
    );


    console.log(
        `Records / round       : ${baseline.configuration.recordCount}`
    );

    console.log(
        `Rounds                : ${baseline.configuration.rounds}`
    );

    console.log(
        `Total normalized      : ${baseline.workload.totalNormalized}`
    );

    console.log(
        `Initial RSS           : ${baseline.memory.first.megabytes.rss} MB`
    );

    console.log(
        `Final RSS             : ${baseline.memory.last.megabytes.rss} MB`
    );

    console.log(
        `Peak RSS              : ${baseline.memory.peak.megabytes.rss} MB`
    );

    console.log(
        `RSS delta             : ${baseline.memory.delta.megabytes.rss} MB`
    );

    console.log(
        `Initial heap used     : ${baseline.memory.first.megabytes.heapUsed} MB`
    );

    console.log(
        `Final heap used       : ${baseline.memory.last.megabytes.heapUsed} MB`
    );

    console.log(
        `Peak heap used        : ${baseline.memory.peak.megabytes.heapUsed} MB`
    );

    console.log(
        `Heap-used delta       : ${baseline.memory.delta.megabytes.heapUsed} MB`
    );

    console.log(
        `CPU user              : ${baseline.cpu.userMs} ms`
    );

    console.log(
        `CPU system            : ${baseline.cpu.systemMs} ms`
    );

    console.log(
        `CPU total             : ${baseline.cpu.totalMs} ms`
    );

    console.log(
        `Wall duration         : ${baseline.cpu.wallDurationMs} ms`
    );

    console.log(
        `CPU / wall ratio      : ${baseline.cpu.cpuToWallRatio}`
    );


    for (
        const round
        of baseline.roundResults
    ) {
        console.log(
            `Round ${round.round} duration       : ${round.durationMs} ms`
        );

        console.log(
            `Round ${round.round} RSS            : ${round.memory.megabytes.rss} MB`
        );

        console.log(
            `Round ${round.round} heap used      : ${round.memory.megabytes.heapUsed} MB`
        );
    }


    console.log("");
    console.log(
        "-".repeat(
            76
        )
    );

    console.log(
        "PHASE 14.6 MEMORY / CPU RESOURCE BEHAVIOR RESULT"
    );

    console.log(
        "-".repeat(
            76
        )
    );

    console.log(
        `Peak RSS                     : ${baseline.memory.peak.megabytes.rss} MB`
    );

    console.log(
        `Peak heap used               : ${baseline.memory.peak.megabytes.heapUsed} MB`
    );

    console.log(
        `Final RSS delta              : ${baseline.memory.delta.megabytes.rss} MB`
    );

    console.log(
        `Final heap-used delta        : ${baseline.memory.delta.megabytes.heapUsed} MB`
    );

    console.log(
        `CPU total                    : ${baseline.cpu.totalMs} ms`
    );

    console.log(
        `CPU / wall ratio             : ${baseline.cpu.cpuToWallRatio}`
    );

    console.log(
        "Arbitrary memory SLA         : NONE"
    );

    console.log(
        "Arbitrary CPU SLA            : NONE"
    );

    console.log(
        "Forced garbage collection    : NO"
    );

    console.log(
        "Database mutation            : NONE"
    );

    console.log(
        "VRM request                  : NONE"
    );

    console.log(
        "Production scheduler         : NOT STARTED"
    );

    console.log(
        "Equipment control            : NONE"
    );

    console.log(
        "Auto-dispatch                : DISABLED"
    );

    console.log(
        "-".repeat(
            76
        )
    );


    console.log("");
    console.log(
        `Assertions passed: ${assertionsPassed}`
    );

    console.log(
        "ASHMAAN PHASE 14.6 MEMORY / CPU RESOURCE BEHAVIOR VALIDATION PASSED"
    );


    process.exitCode =
        0;

} catch (error) {

    console.error("");
    console.error(
        "=".repeat(
            76
        )
    );

    console.error(
        "ASHMAAN PHASE 14.6 MEMORY / CPU RESOURCE BEHAVIOR VALIDATION FAILED"
    );

    console.error(
        "=".repeat(
            76
        )
    );

    console.error(
        error
    );

    console.error("");
    console.error(
        "Use the first failed assertion as evidence. Do not tune Node heap limits, force GC, alter scheduler behavior, or change production data paths without measured justification."
    );


    process.exitCode =
        1;
}