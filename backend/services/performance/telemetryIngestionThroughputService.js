// ============================================================================
// ASHMAAN PHASE 14.4 — TELEMETRY INGESTION THROUGHPUT BASELINE
// ============================================================================
//
// Measurement scope:
//
// CONTROLLED FIXTURE
//      ↓
// production normalizeTelemetryRecord()
//      ↓
// bounded in-memory batching
//      ↓
// duplicate classification
//      ↓
// throughput statistics
//
// IMPORTANT:
//
// This checkpoint deliberately stops BEFORE Telemetry.bulkWrite().
//
// It measures the CPU-side preprocessing / normalization portion of the
// production ingestion chain without writing synthetic benchmark data to
// MongoDB.
//
// ============================================================================

import { performance } from "node:perf_hooks";

import {
    normalizeTelemetryRecord,
} from "../sync/telemetryNormalizer.js";

export const PHASE_14_TELEMETRY_INGESTION_THROUGHPUT =
    Object.freeze({
        phase: "14.4",

        layer:
            "TELEMETRY_INGESTION_THROUGHPUT",

        category:
            "INGESTION_PERFORMANCE_BASELINE",

        mode:
            "CONTROLLED_IN_MEMORY_MEASUREMENT",

        productionPath:
            Object.freeze({
                source:
                    "VRM",

                normalizer:
                    "normalizeTelemetryRecord",

                persistence:
                    "Telemetry.bulkWrite",

                productionSchedulerEntry:
                    "syncTelemetryByVrmSiteId",

                benchmarkStopsBeforePersistence:
                    true,
            }),

        defaults:
            Object.freeze({
                recordCount:
                    5_000,

                batchSize:
                    250,

                rounds:
                    3,

                maxRecordCount:
                    10_000,

                maxBatchSize:
                    1_000,

                maxRounds:
                    5,

                executionMode:
                    "SEQUENTIAL_BATCHES",
            }),

        semantics:
            Object.freeze({
                missingTelemetryIsZero:
                    false,

                observedZeroRemainsZero:
                    true,

                invalidTimestampIsInvalid:
                    true,

                missingRawValueIsMissing:
                    true,

                unitInferenceAllowed:
                    false,

                topologyInferenceAllowed:
                    false,

                silentInterpolationAllowed:
                    false,

                silentResamplingAllowed:
                    false,

                syntheticFixtureIsProductionEvidence:
                    false,
            }),

        executionBoundary:
            Object.freeze({
                performsVrmRequest:
                    false,

                performsDatabaseRead:
                    false,

                performsDatabaseWrite:
                    false,

                performsBulkWrite:
                    false,

                performsDocumentInsert:
                    false,

                performsDocumentUpdate:
                    false,

                performsDocumentDelete:
                    false,

                performsSchedulerMutation:
                    false,

                performsRuntimeConfigMutation:
                    false,

                performsConcurrentFlood:
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
        typeof value !== "number" ||
        !Number.isFinite(value)
    ) {
        return null;
    }

    const factor =
        10 ** digits;

    return (
        Math.round(
            value * factor
        ) / factor
    );
}

function requirePositiveInteger(
    value,
    name,
    maximum
) {
    if (
        !Number.isInteger(value) ||
        value < 1 ||
        value > maximum
    ) {
        throw new RangeError(
            `${name} must be an integer between 1 and ${maximum}`
        );
    }
}

export function buildTelemetryIdentity(
    normalizedRecord
) {
    if (
        !normalizedRecord ||
        typeof normalizedRecord !==
        "object"
    ) {
        throw new TypeError(
            "normalizedRecord must be an object"
        );
    }

    const timestamp =
        normalizedRecord.timestamp
            instanceof Date &&
            Number.isFinite(
                normalizedRecord.timestamp
                    .getTime()
            )
            ? normalizedRecord.timestamp
                .toISOString()
            : "INVALID_TIMESTAMP";

    return [
        String(
            normalizedRecord.installation ??
            ""
        ),

        String(
            normalizedRecord.device ??
            ""
        ),

        timestamp,

        String(
            normalizedRecord.vrmAttributeId ??
            ""
        ),

        String(
            normalizedRecord.deviceType ??
            ""
        ),

        String(
            normalizedRecord.deviceInstance ??
            ""
        ),
    ].join("|");
}

export function buildControlledTelemetryFixture({
    recordCount =
    PHASE_14_TELEMETRY_INGESTION_THROUGHPUT
        .defaults.recordCount,

    duplicateEvery =
    100,
} = {}) {
    requirePositiveInteger(
        recordCount,
        "recordCount",
        PHASE_14_TELEMETRY_INGESTION_THROUGHPUT
            .defaults.maxRecordCount
    );

    requirePositiveInteger(
        duplicateEvery,
        "duplicateEvery",
        recordCount
    );

    const records = [];

    const baseTimestampSeconds =
        1_780_000_000;

    let duplicateCount =
        0;

    for (
        let index = 0;
        index < recordCount;
        index += 1
    ) {
        if (
            index > 0 &&
            index % duplicateEvery ===
            0
        ) {
            records.push({
                ...records[
                records.length - 1
                ],
            });

            duplicateCount += 1;

            continue;
        }

        let rawValue =
            index % 7 === 0
                ? 0
                : (
                    100 +
                    index / 10
                );

        if (
            index % 211 === 0
        ) {
            rawValue =
                null;
        }

        const timestamp =
            index % 307 === 0
                ? "INVALID_TIMESTAMP"
                : (
                    baseTimestampSeconds +
                    index
                );

        records.push({
            timestamp,

            rawValue,

            idDataAttribute:
                100 +
                (
                    index %
                    40
                ),

            code:
                `ATTR_${100 + (index % 40)}`,

            description:
                `Phase 14.4 Attribute ${100 +
                (
                    index %
                    40
                )
                }`,

            Device:
                index % 2 === 0
                    ? "VE.Bus System"
                    : "Solar Charger",

            instance:
                String(
                    index %
                    4
                ),

            dbusServiceType:
                index % 2 === 0
                    ? "vebus"
                    : "solarcharger",

            dbusPath:
                `/Phase14/${index % 40}`,

            formatWithUnit:
                index % 2 === 0
                    ? "%.1F W"
                    : "%.1F V",

            formattedValue:
                rawValue === null
                    ? null
                    : String(
                        rawValue
                    ),
        });
    }

    return {
        recordCount:
            records.length,

        duplicateCount,

        records,
    };
}

function createQualityCounts() {
    return {
        VALID:
            0,

        MISSING:
            0,

        INVALID:
            0,

        STALE:
            0,

        ESTIMATED:
            0,

        OUTLIER:
            0,

        UNKNOWN:
            0,
    };
}

export function summarizeNormalizedTelemetry(
    records
) {
    if (
        !Array.isArray(records)
    ) {
        throw new TypeError(
            "records must be an array"
        );
    }

    const qualityCounts =
        createQualityCounts();

    let zeroRawCount =
        0;

    let zeroNumericCount =
        0;

    let missingRawCount =
        0;

    let missingRawWithValidTimestampCount =
        0;

    let missingQualityCount =
        0;

    let invalidTimestampCount =
        0;

    let invalidQualityCount =
        0;

    for (
        const record
        of records
    ) {
        const quality =
            typeof record?.quality ===
                "string"
                ? record.quality
                : "UNKNOWN";

        if (
            Object.prototype
                .hasOwnProperty.call(
                    qualityCounts,
                    quality
                )
        ) {
            qualityCounts[
                quality
            ] += 1;
        } else {
            qualityCounts.UNKNOWN +=
                1;
        }

        if (
            record?.value ===
            0
        ) {
            zeroRawCount +=
                1;

            if (
                record.numericValue ===
                0
            ) {
                zeroNumericCount +=
                    1;
            }
        }

        const validTimestamp =
            record?.timestamp
            instanceof Date &&
            Number.isFinite(
                record.timestamp
                    .getTime()
            );

        if (
            record?.value ===
            null ||
            record?.value ===
            undefined
        ) {
            missingRawCount +=
                1;

            if (
                validTimestamp
            ) {
                missingRawWithValidTimestampCount +=
                    1;
            }

            if (
                record?.quality ===
                "MISSING"
            ) {
                missingQualityCount +=
                    1;
            }
        }

        if (
            !validTimestamp
        ) {
            invalidTimestampCount +=
                1;

            if (
                record?.quality ===
                "INVALID"
            ) {
                invalidQualityCount +=
                    1;
            }
        }
    }

    return {
        recordCount:
            records.length,

        qualityCounts,

        zeroRawCount,

        zeroNumericCount,

        missingRawCount,

        missingRawWithValidTimestampCount,

        missingQualityCount,

        invalidTimestampCount,

        invalidQualityCount,
    };
}

export function normalizeTelemetryBatch({
    records,
    installation,
    device = null,
} = {}) {
    if (
        !Array.isArray(records)
    ) {
        throw new TypeError(
            "records must be an array"
        );
    }

    if (
        !installation ||
        typeof installation !==
        "object" ||
        installation._id ===
        undefined ||
        installation._id ===
        null
    ) {
        throw new TypeError(
            "installation with _id is required"
        );
    }

    return records.map(
        (record) =>
            normalizeTelemetryRecord({
                record,
                installation,
                device,
            })
    );
}

export function classifyDuplicateTelemetry(
    normalizedRecords
) {
    if (
        !Array.isArray(
            normalizedRecords
        )
    ) {
        throw new TypeError(
            "normalizedRecords must be an array"
        );
    }

    const identities =
        new Set();

    const uniqueRecords =
        [];

    const duplicateRecords =
        [];

    for (
        const record
        of normalizedRecords
    ) {
        const identity =
            buildTelemetryIdentity(
                record
            );

        if (
            identities.has(
                identity
            )
        ) {
            duplicateRecords.push(
                record
            );

            continue;
        }

        identities.add(
            identity
        );

        uniqueRecords.push(
            record
        );
    }

    return {
        inputCount:
            normalizedRecords.length,

        uniqueCount:
            uniqueRecords.length,

        duplicateCount:
            duplicateRecords.length,

        uniqueRecords,

        duplicateRecords,
    };
}

export async function measureTelemetryNormalizationThroughput({
    records,
    installation,
    device = null,

    batchSize =
    PHASE_14_TELEMETRY_INGESTION_THROUGHPUT
        .defaults.batchSize,
} = {}) {
    if (
        !Array.isArray(records) ||
        records.length === 0
    ) {
        throw new TypeError(
            "records must be a non-empty array"
        );
    }

    if (
        records.length >
        PHASE_14_TELEMETRY_INGESTION_THROUGHPUT
            .defaults.maxRecordCount
    ) {
        throw new RangeError(
            "records exceed the bounded Phase 14.4 maximum"
        );
    }

    requirePositiveInteger(
        batchSize,
        "batchSize",
        PHASE_14_TELEMETRY_INGESTION_THROUGHPUT
            .defaults.maxBatchSize
    );

    const normalized =
        [];

    const batchMeasurements =
        [];

    const startedAt =
        performance.now();

    for (
        let offset = 0;
        offset < records.length;
        offset += batchSize
    ) {
        const batch =
            records.slice(
                offset,
                offset +
                batchSize
            );

        const batchStartedAt =
            performance.now();

        const normalizedBatch =
            normalizeTelemetryBatch({
                records:
                    batch,

                installation,

                device,
            });

        normalized.push(
            ...normalizedBatch
        );

        const batchCompletedAt =
            performance.now();

        batchMeasurements.push({
            batchNumber:
                batchMeasurements.length +
                1,

            inputCount:
                batch.length,

            outputCount:
                normalizedBatch.length,

            durationMs:
                round(
                    batchCompletedAt -
                    batchStartedAt
                ),
        });

        // Cooperative yield between bounded batches.
        await new Promise(
            (resolve) =>
                setImmediate(
                    resolve
                )
        );
    }

    const completedAt =
        performance.now();

    const durationMs =
        completedAt -
        startedAt;

    const duplicateClassification =
        classifyDuplicateTelemetry(
            normalized
        );

    const semanticSummary =
        summarizeNormalizedTelemetry(
            normalized
        );

    const recordsPerSecond =
        durationMs > 0
            ? (
                normalized.length /
                (
                    durationMs /
                    1000
                )
            )
            : null;

    const millisecondsPerRecord =
        normalized.length > 0
            ? (
                durationMs /
                normalized.length
            )
            : null;

    return {
        inputCount:
            records.length,

        normalizedCount:
            normalized.length,

        batchSize,

        batchCount:
            batchMeasurements.length,

        executionMode:
            "SEQUENTIAL_BATCHES",

        durationMs:
            round(
                durationMs
            ),

        recordsPerSecond:
            round(
                recordsPerSecond
            ),

        millisecondsPerRecord:
            round(
                millisecondsPerRecord,
                6
            ),

        batchMeasurements,

        duplicateClassification: {
            inputCount:
                duplicateClassification
                    .inputCount,

            uniqueCount:
                duplicateClassification
                    .uniqueCount,

            duplicateCount:
                duplicateClassification
                    .duplicateCount,
        },

        semanticSummary,

        normalized,
    };
}

function calculateStatistics(
    values
) {
    const finiteValues =
        values
            .filter(
                (value) =>
                    typeof value ===
                    "number" &&
                    Number.isFinite(value)
            )
            .sort(
                (a, b) =>
                    a - b
            );

    if (
        finiteValues.length ===
        0
    ) {
        return {
            count:
                0,

            min:
                null,

            max:
                null,

            mean:
                null,

            median:
                null,
        };
    }

    const sum =
        finiteValues.reduce(
            (total, value) =>
                total + value,
            0
        );

    const midpoint =
        Math.floor(
            finiteValues.length /
            2
        );

    const median =
        finiteValues.length %
            2 ===
            1
            ? finiteValues[
            midpoint
            ]
            : (
                (
                    finiteValues[
                    midpoint - 1
                    ] +
                    finiteValues[
                    midpoint
                    ]
                ) /
                2
            );

    return {
        count:
            finiteValues.length,

        min:
            round(
                finiteValues[0]
            ),

        max:
            round(
                finiteValues[
                finiteValues.length -
                1
                ]
            ),

        mean:
            round(
                sum /
                finiteValues.length
            ),

        median:
            round(
                median
            ),
    };
}

export async function runTelemetryIngestionThroughputBaseline({
    recordCount =
    PHASE_14_TELEMETRY_INGESTION_THROUGHPUT
        .defaults.recordCount,

    batchSize =
    PHASE_14_TELEMETRY_INGESTION_THROUGHPUT
        .defaults.batchSize,

    rounds =
    PHASE_14_TELEMETRY_INGESTION_THROUGHPUT
        .defaults.rounds,
} = {}) {
    requirePositiveInteger(
        recordCount,
        "recordCount",
        PHASE_14_TELEMETRY_INGESTION_THROUGHPUT
            .defaults.maxRecordCount
    );

    requirePositiveInteger(
        batchSize,
        "batchSize",
        PHASE_14_TELEMETRY_INGESTION_THROUGHPUT
            .defaults.maxBatchSize
    );

    requirePositiveInteger(
        rounds,
        "rounds",
        PHASE_14_TELEMETRY_INGESTION_THROUGHPUT
            .defaults.maxRounds
    );

    const fixture =
        buildControlledTelemetryFixture({
            recordCount,
        });

    const installation =
        Object.freeze({
            _id:
                "phase14-4-installation",

            site:
                "phase14-4-site",
        });

    const device =
        Object.freeze({
            _id:
                "phase14-4-device",
        });

    const measurements =
        [];

    for (
        let round = 1;
        round <= rounds;
        round += 1
    ) {
        const measurement =
            await measureTelemetryNormalizationThroughput({
                records:
                    fixture.records,

                installation,

                device,

                batchSize,
            });

        measurements.push({
            round,

            ...measurement,

            // Do not retain thousands of normalized fixture rows
            // in the aggregate result.
            normalized:
                undefined,
        });
    }

    return {
        phase:
            PHASE_14_TELEMETRY_INGESTION_THROUGHPUT.phase,

        layer:
            PHASE_14_TELEMETRY_INGESTION_THROUGHPUT.layer,

        category:
            PHASE_14_TELEMETRY_INGESTION_THROUGHPUT.category,

        mode:
            PHASE_14_TELEMETRY_INGESTION_THROUGHPUT.mode,

        fixture: {
            recordCount:
                fixture.recordCount,

            duplicateCount:
                fixture.duplicateCount,

            productionEvidence:
                false,
        },

        batchSize,

        rounds,

        totalRecordsMeasured:
            recordCount *
            rounds,

        executionMode:
            "SEQUENTIAL_BATCHES",

        measurements,

        throughput:
            calculateStatistics(
                measurements.map(
                    (measurement) =>
                        measurement
                            .recordsPerSecond
                )
            ),

        duration:
            calculateStatistics(
                measurements.map(
                    (measurement) =>
                        measurement
                            .durationMs
                )
            ),

        millisecondsPerRecord:
            calculateStatistics(
                measurements.map(
                    (measurement) =>
                        measurement
                            .millisecondsPerRecord
                )
            ),

        semantics:
            PHASE_14_TELEMETRY_INGESTION_THROUGHPUT
                .semantics,

        productionPath:
            PHASE_14_TELEMETRY_INGESTION_THROUGHPUT
                .productionPath,

        executionBoundary:
            PHASE_14_TELEMETRY_INGESTION_THROUGHPUT
                .executionBoundary,
    };
}

export default
    PHASE_14_TELEMETRY_INGESTION_THROUGHPUT;