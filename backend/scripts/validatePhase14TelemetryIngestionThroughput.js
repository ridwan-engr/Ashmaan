// ============================================================================
// ASHMAAN PHASE 14.4 — TELEMETRY INGESTION THROUGHPUT VALIDATION
// ============================================================================

import assert from "node:assert/strict";
import fs from "node:fs";

import telemetryThroughputContract, {
    buildControlledTelemetryFixture,
    measureTelemetryNormalizationThroughput,
    runTelemetryIngestionThroughputBaseline,
} from "../services/performance/telemetryIngestionThroughputService.js";

const RECORD_COUNT =
    5_000;

const BATCH_SIZE =
    250;

const ROUNDS =
    3;

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

function formatMs(
    value
) {
    return Number.isFinite(
        value
    )
        ? `${value.toFixed(3)} ms`
        : "N/A";
}

function formatRate(
    value
) {
    return Number.isFinite(
        value
    )
        ? `${value.toFixed(3)} records/s`
        : "N/A";
}

console.log("");
console.log(
    "=".repeat(72)
);

console.log(
    "ASHMAAN PHASE 14.4 — TELEMETRY INGESTION THROUGHPUT VALIDATION"
);

console.log(
    "=".repeat(72)
);

console.log(
    `Records / round      : ${RECORD_COUNT}`
);

console.log(
    `Batch size           : ${BATCH_SIZE}`
);

console.log(
    `Measurement rounds   : ${ROUNDS}`
);

console.log(
    "Persistence          : DISABLED"
);

try {
    // -------------------------------------------------------------------------
    // A. Contract identity
    // -------------------------------------------------------------------------

    section(
        "A. Phase identity and contract"
    );

    check(
        telemetryThroughputContract
            .phase ===
        "14.4",
        "phase identity is 14.4"
    );

    check(
        telemetryThroughputContract
            .layer ===
        "TELEMETRY_INGESTION_THROUGHPUT",
        "layer identity is TELEMETRY_INGESTION_THROUGHPUT"
    );

    check(
        telemetryThroughputContract
            .category ===
        "INGESTION_PERFORMANCE_BASELINE",
        "category identifies ingestion performance baseline"
    );

    check(
        telemetryThroughputContract
            .mode ===
        "CONTROLLED_IN_MEMORY_MEASUREMENT",
        "14.4 uses controlled in-memory measurement"
    );

    check(
        Object.isFrozen(
            telemetryThroughputContract
        ),
        "14.4 contract is frozen"
    );

    // -------------------------------------------------------------------------
    // B. Production-path evidence
    // -------------------------------------------------------------------------

    section(
        "B. Production ingestion-path evidence"
    );

    const telemetrySyncPath =
        new URL(
            "../services/sync/telemetrySyncService.js",
            import.meta.url
        );

    const telemetryNormalizerPath =
        new URL(
            "../services/sync/telemetryNormalizer.js",
            import.meta.url
        );

    check(
        fs.existsSync(
            telemetrySyncPath
        ),
        "production telemetry synchronization service exists"
    );

    check(
        fs.existsSync(
            telemetryNormalizerPath
        ),
        "production telemetry normalizer exists"
    );

    const telemetrySyncSource =
        fs.readFileSync(
            telemetrySyncPath,
            "utf8"
        );

    const telemetryNormalizerSource =
        fs.readFileSync(
            telemetryNormalizerPath,
            "utf8"
        );

    check(
        /getInstallationTelemetry/.test(
            telemetrySyncSource
        ),
        "production synchronizer retains VRM telemetry acquisition"
    );

    check(
        /normalizeTelemetryRecord/.test(
            telemetrySyncSource
        ),
        "production synchronizer retains telemetry normalization"
    );

    check(
        /Telemetry\s*\.\s*bulkWrite/.test(
            telemetrySyncSource
        ),
        "production synchronizer retains bulk telemetry persistence"
    );

    check(
        /syncTelemetryByVrmSiteId/.test(
            telemetrySyncSource
        ),
        "production site telemetry synchronization entry point remains present"
    );

    check(
        /normalizeTelemetryRecord/.test(
            telemetryNormalizerSource
        ),
        "production normalizer export remains present"
    );

    check(
        telemetryThroughputContract
            .productionPath
            .benchmarkStopsBeforePersistence ===
        true,
        "14.4 benchmark stops before production persistence"
    );

    // -------------------------------------------------------------------------
    // C. Bounded defaults
    // -------------------------------------------------------------------------

    section(
        "C. Bounded throughput configuration"
    );

    const defaults =
        telemetryThroughputContract
            .defaults;

    check(
        defaults.recordCount ===
        5_000,
        "default fixture contains 5000 records"
    );

    check(
        defaults.batchSize ===
        250,
        "default batch size is bounded at 250 records"
    );

    check(
        defaults.rounds ===
        3,
        "default measurement uses three rounds"
    );

    check(
        defaults.maxRecordCount ===
        10_000,
        "single-round fixture maximum is bounded"
    );

    check(
        defaults.maxBatchSize ===
        1_000,
        "batch-size maximum is bounded"
    );

    check(
        defaults.maxRounds ===
        5,
        "measurement-round maximum is bounded"
    );

    check(
        defaults.executionMode ===
        "SEQUENTIAL_BATCHES",
        "benchmark uses sequential batches"
    );

    // -------------------------------------------------------------------------
    // D. Engineering semantics
    // -------------------------------------------------------------------------

    section(
        "D. Engineering semantics preservation"
    );

    const semantics =
        telemetryThroughputContract
            .semantics;

    check(
        semantics
            .missingTelemetryIsZero ===
        false,
        "missing telemetry is not treated as zero"
    );

    check(
        semantics
            .observedZeroRemainsZero ===
        true,
        "observed zero remains a valid zero"
    );

    check(
        semantics
            .invalidTimestampIsInvalid ===
        true,
        "invalid timestamp remains INVALID"
    );

    check(
        semantics
            .missingRawValueIsMissing ===
        true,
        "missing raw value remains MISSING"
    );

    check(
        semantics
            .unitInferenceAllowed ===
        false,
        "14.4 does not infer engineering units"
    );

    check(
        semantics
            .topologyInferenceAllowed ===
        false,
        "14.4 does not infer topology"
    );

    check(
        semantics
            .silentInterpolationAllowed ===
        false,
        "14.4 does not interpolate telemetry"
    );

    check(
        semantics
            .silentResamplingAllowed ===
        false,
        "14.4 does not silently resample telemetry"
    );

    check(
        semantics
            .syntheticFixtureIsProductionEvidence ===
        false,
        "controlled fixture is not represented as production evidence"
    );

    // -------------------------------------------------------------------------
    // E. Execution safety boundary
    // -------------------------------------------------------------------------

    section(
        "E. Throughput-test safety boundary"
    );

    const boundary =
        telemetryThroughputContract
            .executionBoundary;

    check(
        boundary
            .performsVrmRequest ===
        false,
        "benchmark performs no live VRM request"
    );

    check(
        boundary
            .performsDatabaseRead ===
        false,
        "benchmark performs no database read"
    );

    check(
        boundary
            .performsDatabaseWrite ===
        false,
        "benchmark performs no database write"
    );

    check(
        boundary
            .performsBulkWrite ===
        false,
        "benchmark does not execute Telemetry.bulkWrite"
    );

    check(
        boundary
            .performsDocumentInsert ===
        false,
        "benchmark performs no document insert"
    );

    check(
        boundary
            .performsDocumentUpdate ===
        false,
        "benchmark performs no document update"
    );

    check(
        boundary
            .performsDocumentDelete ===
        false,
        "benchmark performs no document delete"
    );

    check(
        boundary
            .performsSchedulerMutation ===
        false,
        "benchmark performs no scheduler mutation"
    );

    check(
        boundary
            .performsRuntimeConfigMutation ===
        false,
        "benchmark performs no runtime configuration mutation"
    );

    check(
        boundary
            .performsConcurrentFlood ===
        false,
        "benchmark performs no concurrent flood"
    );

    check(
        boundary
            .performsEquipmentControl ===
        false,
        "benchmark performs no equipment control"
    );

    check(
        boundary
            .performsAutoDispatch ===
        false,
        "benchmark performs no automatic dispatch"
    );

    // -------------------------------------------------------------------------
    // F. Controlled fixture
    // -------------------------------------------------------------------------

    section(
        "F. Controlled telemetry fixture"
    );

    const fixture =
        buildControlledTelemetryFixture({
            recordCount:
                RECORD_COUNT,

            duplicateEvery:
                100,
        });

    check(
        fixture.recordCount ===
        RECORD_COUNT,
        "controlled fixture contains exactly 5000 records"
    );

    check(
        fixture.records.length ===
        RECORD_COUNT,
        "fixture array length matches declared record count"
    );

    check(
        fixture.duplicateCount >
        0,
        "fixture contains explicit duplicate telemetry evidence"
    );

    check(
        fixture.records.some(
            (record) =>
                record.rawValue ===
                0
        ),
        "fixture contains observed zero telemetry"
    );

    check(
        fixture.records.some(
            (record) =>
                record.rawValue ===
                null
        ),
        "fixture contains missing raw telemetry"
    );

    check(
        fixture.records.some(
            (record) =>
                record.timestamp ===
                "INVALID_TIMESTAMP"
        ),
        "fixture contains invalid timestamp evidence"
    );

    // -------------------------------------------------------------------------
    // G. Single controlled normalization measurement
    // -------------------------------------------------------------------------

    section(
        "G. Production-normalizer controlled measurement"
    );

    const installation =
    {
        _id:
            "phase14-4-installation",

        site:
            "phase14-4-site",
    };

    const device =
    {
        _id:
            "phase14-4-device",
    };

    const singleMeasurement =
        await measureTelemetryNormalizationThroughput({
            records:
                fixture.records,

            installation,

            device,

            batchSize:
                BATCH_SIZE,
        });

    check(
        singleMeasurement
            .inputCount ===
        RECORD_COUNT,
        "all fixture records entered the normalization measurement"
    );

    check(
        singleMeasurement
            .normalizedCount ===
        RECORD_COUNT,
        "production normalizer returned one output per input record"
    );

    check(
        singleMeasurement
            .batchSize ===
        BATCH_SIZE,
        "measurement preserved configured batch size"
    );

    check(
        singleMeasurement
            .batchCount ===
        20,
        "5000 records were processed in exactly twenty bounded batches"
    );

    check(
        singleMeasurement
            .executionMode ===
        "SEQUENTIAL_BATCHES",
        "controlled measurement remained sequential"
    );

    check(
        Number.isFinite(
            singleMeasurement
                .durationMs
        ) &&
        singleMeasurement
            .durationMs >
        0,
        "normalization duration is finite and positive"
    );

    check(
        Number.isFinite(
            singleMeasurement
                .recordsPerSecond
        ) &&
        singleMeasurement
            .recordsPerSecond >
        0,
        "normalization throughput is finite and positive"
    );

    check(
        Number.isFinite(
            singleMeasurement
                .millisecondsPerRecord
        ) &&
        singleMeasurement
            .millisecondsPerRecord >=
        0,
        "per-record processing time is finite"
    );

    check(
        singleMeasurement
            .batchMeasurements
            .length ===
        20,
        "every bounded batch produced a timing measurement"
    );

    check(
        singleMeasurement
            .batchMeasurements
            .every(
                (batch) =>
                    batch.inputCount <=
                    BATCH_SIZE &&
                    batch.outputCount ===
                    batch.inputCount &&
                    Number.isFinite(
                        batch.durationMs
                    ) &&
                    batch.durationMs >=
                    0
            ),
        "all batch measurements remain bounded and complete"
    );

    // -------------------------------------------------------------------------
    // H. Duplicate-control evidence
    // -------------------------------------------------------------------------

    section(
        "H. Duplicate-control evidence"
    );

    const duplicateSummary =
        singleMeasurement
            .duplicateClassification;

    check(
        duplicateSummary
            .inputCount ===
        RECORD_COUNT,
        "duplicate classifier inspected every normalized record"
    );

    check(
        duplicateSummary
            .duplicateCount ===
        fixture.duplicateCount,
        "duplicate classifier detected the controlled duplicate population"
    );

    check(
        duplicateSummary
            .uniqueCount +
        duplicateSummary
            .duplicateCount ===
        RECORD_COUNT,
        "unique and duplicate classifications reconcile to total input"
    );

    check(
        duplicateSummary
            .uniqueCount <
        RECORD_COUNT,
        "duplicates are distinguished from unique telemetry"
    );

    // -------------------------------------------------------------------------
    // I. Telemetry semantic evidence
    // -------------------------------------------------------------------------

    section(
        "I. Normalized telemetry semantic evidence"
    );

    const semanticSummary =
        singleMeasurement
            .semanticSummary;

    check(
        semanticSummary
            .recordCount ===
        RECORD_COUNT,
        "semantic inspection covers every normalized record"
    );

    check(
        semanticSummary
            .zeroRawCount >
        0,
        "normalized evidence contains observed zero values"
    );

    check(
        semanticSummary
            .zeroNumericCount ===
        semanticSummary
            .zeroRawCount,
        "observed numeric zero remains zero after normalization"
    );

    check(
        semanticSummary
            .missingRawCount >
        0,
        "normalized evidence contains missing raw values"
    );

    check(
        semanticSummary
            .missingQualityCount ===
        semanticSummary
            .missingRawWithValidTimestampCount,
        "missing raw values are classified as MISSING when timestamps are valid"
    );

    check(
        semanticSummary
            .missingRawWithValidTimestampCount <=
        semanticSummary
            .missingRawCount,
        "missing telemetry accounting distinguishes valid-timestamp records from invalid-timestamp overlap"
    );

    check(
        semanticSummary
            .invalidTimestampCount >
        0,
        "normalized evidence contains invalid timestamps"
    );

    check(
        semanticSummary
            .invalidQualityCount ===
        semanticSummary
            .invalidTimestampCount,
        "invalid timestamps are classified as INVALID"
    );

    check(
        semanticSummary
            .qualityCounts
            .UNKNOWN ===
        0,
        "normalizer produced no unknown quality classification"
    );

    // -------------------------------------------------------------------------
    // J. Multi-round throughput baseline
    // -------------------------------------------------------------------------

    section(
        "J. Multi-round throughput baseline"
    );

    const baseline =
        await runTelemetryIngestionThroughputBaseline({
            recordCount:
                RECORD_COUNT,

            batchSize:
                BATCH_SIZE,

            rounds:
                ROUNDS,
        });

    check(
        baseline.phase ===
        "14.4",
        "baseline identifies Phase 14.4"
    );

    check(
        baseline.layer ===
        "TELEMETRY_INGESTION_THROUGHPUT",
        "baseline identifies telemetry ingestion throughput layer"
    );

    check(
        baseline.category ===
        "INGESTION_PERFORMANCE_BASELINE",
        "baseline identifies ingestion performance category"
    );

    check(
        baseline.mode ===
        "CONTROLLED_IN_MEMORY_MEASUREMENT",
        "baseline remains controlled in-memory measurement"
    );

    check(
        baseline.fixture
            .recordCount ===
        RECORD_COUNT,
        "baseline fixture contains 5000 records per round"
    );

    check(
        baseline.fixture
            .productionEvidence ===
        false,
        "baseline does not represent fixture data as production evidence"
    );

    check(
        baseline.batchSize ===
        BATCH_SIZE,
        "baseline batch size remained 250"
    );

    check(
        baseline.rounds ===
        ROUNDS,
        "baseline completed exactly three measurement rounds"
    );

    check(
        baseline.totalRecordsMeasured ===
        RECORD_COUNT *
        ROUNDS,
        "baseline measured exactly 15000 normalization operations"
    );

    check(
        baseline.executionMode ===
        "SEQUENTIAL_BATCHES",
        "multi-round baseline remained sequential"
    );

    check(
        baseline.measurements
            .length ===
        ROUNDS,
        "baseline returned one result per measurement round"
    );

    for (
        const measurement
        of baseline.measurements
    ) {
        check(
            measurement.inputCount ===
            RECORD_COUNT,
            `round ${measurement.round} received exactly 5000 records`
        );

        check(
            measurement.normalizedCount ===
            RECORD_COUNT,
            `round ${measurement.round} normalized every record`
        );

        check(
            measurement.batchCount ===
            20,
            `round ${measurement.round} used twenty bounded batches`
        );

        check(
            Number.isFinite(
                measurement
                    .durationMs
            ) &&
            measurement.durationMs >
            0,
            `round ${measurement.round} duration is finite and positive`
        );

        check(
            Number.isFinite(
                measurement
                    .recordsPerSecond
            ) &&
            measurement
                .recordsPerSecond >
            0,
            `round ${measurement.round} throughput is finite and positive`
        );

        check(
            Number.isFinite(
                measurement
                    .millisecondsPerRecord
            ) &&
            measurement
                .millisecondsPerRecord >=
            0,
            `round ${measurement.round} per-record latency is finite`
        );

        check(
            measurement
                .duplicateClassification
                .duplicateCount ===
            baseline.fixture
                .duplicateCount,
            `round ${measurement.round} preserves duplicate classification`
        );
    }

    // -------------------------------------------------------------------------
    // K. Aggregate throughput evidence
    // -------------------------------------------------------------------------

    section(
        "K. Aggregate throughput evidence"
    );

    check(
        baseline.throughput
            .count ===
        ROUNDS,
        "throughput statistics contain all measurement rounds"
    );

    check(
        Number.isFinite(
            baseline.throughput
                .min
        ) &&
        baseline.throughput
            .min >
        0,
        "minimum measured throughput is finite and positive"
    );

    check(
        Number.isFinite(
            baseline.throughput
                .max
        ) &&
        baseline.throughput
            .max >=
        baseline.throughput
            .min,
        "maximum measured throughput is finite and ordered"
    );

    check(
        Number.isFinite(
            baseline.throughput
                .mean
        ) &&
        baseline.throughput
            .mean >
        0,
        "mean measured throughput is finite and positive"
    );

    check(
        Number.isFinite(
            baseline.throughput
                .median
        ) &&
        baseline.throughput
            .median >
        0,
        "median measured throughput is finite and positive"
    );

    check(
        baseline.duration
            .count ===
        ROUNDS,
        "duration statistics contain all measurement rounds"
    );

    check(
        baseline
            .millisecondsPerRecord
            .count ===
        ROUNDS,
        "per-record timing statistics contain all rounds"
    );

    // -------------------------------------------------------------------------
    // L. Measured report
    // -------------------------------------------------------------------------

    section(
        "L. Measured ingestion baseline"
    );

    for (
        const measurement
        of baseline.measurements
    ) {
        console.log("");
        console.log(
            `[ROUND ${measurement.round}]`
        );

        console.log(
            `Records             : ${measurement.inputCount}`
        );

        console.log(
            `Batches             : ${measurement.batchCount}`
        );

        console.log(
            `Duration            : ${formatMs(measurement.durationMs)}`
        );

        console.log(
            `Throughput          : ${formatRate(measurement.recordsPerSecond)}`
        );

        console.log(
            `Milliseconds/record : ${measurement.millisecondsPerRecord}`
        );

        console.log(
            `Unique              : ${measurement.duplicateClassification.uniqueCount}`
        );

        console.log(
            `Duplicates          : ${measurement.duplicateClassification.duplicateCount}`
        );

        console.log(
            `VALID               : ${measurement.semanticSummary.qualityCounts.VALID}`
        );

        console.log(
            `MISSING             : ${measurement.semanticSummary.qualityCounts.MISSING}`
        );

        console.log(
            `INVALID             : ${measurement.semanticSummary.qualityCounts.INVALID}`
        );
    }

    console.log("");
    console.log(
        "[AGGREGATE]"
    );

    console.log(
        `Records measured      : ${baseline.totalRecordsMeasured}`
    );

    console.log(
        `Throughput min        : ${formatRate(baseline.throughput.min)}`
    );

    console.log(
        `Throughput max        : ${formatRate(baseline.throughput.max)}`
    );

    console.log(
        `Throughput mean       : ${formatRate(baseline.throughput.mean)}`
    );

    console.log(
        `Throughput median     : ${formatRate(baseline.throughput.median)}`
    );

    console.log(
        `Duration mean         : ${formatMs(baseline.duration.mean)}`
    );

    console.log(
        `ms/record mean        : ${baseline.millisecondsPerRecord.mean}`
    );

    // -------------------------------------------------------------------------
    // M. Final safety confirmation
    // -------------------------------------------------------------------------

    section(
        "M. Final ingestion safety confirmation"
    );

    check(
        baseline
            .productionPath
            .benchmarkStopsBeforePersistence ===
        true,
        "benchmark terminates before Telemetry.bulkWrite"
    );

    check(
        baseline
            .executionBoundary
            .performsDatabaseWrite ===
        false,
        "throughput baseline performs no database write"
    );

    check(
        baseline
            .executionBoundary
            .performsBulkWrite ===
        false,
        "throughput baseline executes no bulk persistence"
    );

    check(
        baseline
            .executionBoundary
            .performsVrmRequest ===
        false,
        "throughput baseline executes no external VRM request"
    );

    check(
        baseline
            .executionBoundary
            .performsSchedulerMutation ===
        false,
        "throughput baseline performs no scheduler mutation"
    );

    check(
        baseline
            .executionBoundary
            .performsConcurrentFlood ===
        false,
        "throughput baseline performs no concurrency flood"
    );

    check(
        baseline
            .executionBoundary
            .performsEquipmentControl ===
        false,
        "throughput baseline performs no equipment control"
    );

    check(
        baseline
            .executionBoundary
            .performsAutoDispatch ===
        false,
        "throughput baseline performs no automatic dispatch"
    );

    // -------------------------------------------------------------------------
    // Final
    // -------------------------------------------------------------------------

    console.log("");
    console.log(
        "-".repeat(72)
    );

    console.log(
        "PHASE 14.4 TELEMETRY INGESTION THROUGHPUT RESULT"
    );

    console.log(
        "-".repeat(72)
    );

    console.log(
        `Records / round       : ${RECORD_COUNT}`
    );

    console.log(
        `Rounds                : ${ROUNDS}`
    );

    console.log(
        `Total measured        : ${baseline.totalRecordsMeasured}`
    );

    console.log(
        `Batch size            : ${BATCH_SIZE}`
    );

    console.log(
        `Mean throughput       : ${formatRate(baseline.throughput.mean)}`
    );

    console.log(
        `Median throughput     : ${formatRate(baseline.throughput.median)}`
    );

    console.log(
        `Mean ms/record        : ${baseline.millisecondsPerRecord.mean}`
    );

    console.log(
        "Production normalizer : EXECUTED"
    );

    console.log(
        "Synthetic DB writes   : NONE"
    );

    console.log(
        "Telemetry bulkWrite   : NOT EXECUTED"
    );

    console.log(
        "VRM external request  : NONE"
    );

    console.log(
        "Scheduler mutation    : NONE"
    );

    console.log(
        "Equipment control     : NONE"
    );

    console.log(
        "Auto-dispatch         : DISABLED"
    );

    console.log(
        "-".repeat(72)
    );

    console.log("");
    console.log(
        `Assertions passed: ${assertionsPassed}`
    );

    console.log(
        "ASHMAAN PHASE 14.4 TELEMETRY INGESTION THROUGHPUT VALIDATION PASSED"
    );

    process.exitCode =
        0;
} catch (error) {
    console.error("");
    console.error(
        "=".repeat(72)
    );

    console.error(
        "ASHMAAN PHASE 14.4 TELEMETRY INGESTION THROUGHPUT VALIDATION FAILED"
    );

    console.error(
        "=".repeat(72)
    );

    console.error(
        error
    );

    console.error("");
    console.error(
        "Do not modify production telemetry persistence, scheduler concurrency, or MongoDB based on assumptions."
    );

    console.error(
        "Use the first failed assertion and measured throughput evidence only."
    );

    process.exitCode =
        1;
}