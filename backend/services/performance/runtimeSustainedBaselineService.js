// services/performance/runtimeSustainedBaselineService.js

import {
  performance,
} from "node:perf_hooks";

import {
  normalizeTelemetryRecord,
} from "../sync/telemetryNormalizer.js";


/*
|--------------------------------------------------------------------------
| ASHMAAN
| Phase 14.7 — Sustained Runtime / Repeated-Workload Stability
|--------------------------------------------------------------------------
|
| Purpose:
|
| Establish a controlled, bounded, in-process sustained-runtime baseline
| around the production telemetry normalizer.
|
| This phase is observational.
|
| It does NOT:
|
| - call VRM
| - read or write MongoDB
| - start the production scheduler
| - change runtime configuration
| - force garbage collection
| - perform equipment control
| - perform automatic dispatch
| - introduce arbitrary memory / CPU SLA thresholds
|
|--------------------------------------------------------------------------
*/


export const RUNTIME_SUSTAINED_PHASE =
  "14.7";

export const RUNTIME_SUSTAINED_LAYER =
  "RUNTIME_RESOURCE_BEHAVIOR";

export const RUNTIME_SUSTAINED_CATEGORY =
  "SUSTAINED_REPEATED_WORKLOAD_STABILITY";

export const RUNTIME_SUSTAINED_MEASUREMENT =
  "CONTROLLED_BOUNDED_IN_PROCESS";


/*
|--------------------------------------------------------------------------
| Bounded defaults
|--------------------------------------------------------------------------
*/

export const RUNTIME_SUSTAINED_DEFAULTS =
  Object.freeze({
    recordsPerCycle:
      5000,

    cycles:
      10,

    batchSize:
      250,
  });


/*
|--------------------------------------------------------------------------
| Explicit upper bounds
|--------------------------------------------------------------------------
|
| These are workload safety limits, not performance SLA thresholds.
|
|--------------------------------------------------------------------------
*/

export const RUNTIME_SUSTAINED_LIMITS =
  Object.freeze({
    maxRecordsPerCycle:
      20_000,

    maxCycles:
      20,

    maxBatchSize:
      1000,
  });


/*
|--------------------------------------------------------------------------
| Measurement contract
|--------------------------------------------------------------------------
*/

export const RUNTIME_SUSTAINED_MEASUREMENTS =
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

    perCycleDuration:
      true,

    fastestCycle:
      true,

    slowestCycle:
      true,

    meanCycleDuration:
      true,
  });


/*
|--------------------------------------------------------------------------
| Semantic boundaries
|--------------------------------------------------------------------------
*/

export const RUNTIME_SUSTAINED_BOUNDARIES =
  Object.freeze({
    controlledMeasurement:
      true,

    boundedWorkload:
      true,

    productionNormalizerUsed:
      true,

    controlledFixtureIsProductionEvidence:
      false,

    missingTelemetryMeansZero:
      false,

    unitInferenceAllowed:
      false,

    topologyInferenceAllowed:
      false,

    arbitraryMemoryFailureThreshold:
      false,

    arbitraryCpuFailureThreshold:
      false,

    negativeMemoryDeltaIsFailure:
      false,

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
  });


/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

const BYTES_PER_MEGABYTE =
  1024 * 1024;


function finiteNonNegative(
  value
) {
  return (
    typeof value ===
      "number" &&
    Number.isFinite(
      value
    ) &&
    value >=
      0
  );
}


function assertPositiveInteger(
  value,
  name
) {
  if (
    !Number.isInteger(
      value
    ) ||
    value <=
      0
  ) {
    throw new TypeError(
      `${name} must be a positive integer.`
    );
  }
}


function assertWithinLimit(
  value,
  limit,
  name
) {
  assertPositiveInteger(
    value,
    name
  );

  if (
    value >
    limit
  ) {
    throw new RangeError(
      `${name} exceeds Phase 14.7 bounded safety limit.`
    );
  }
}


function bytesToMegabytes(
  bytes
) {
  return (
    bytes /
    BYTES_PER_MEGABYTE
  );
}


/*
|--------------------------------------------------------------------------
| Controlled installation fixture
|--------------------------------------------------------------------------
*/

export function buildRuntimeInstallationFixture() {
  return Object.freeze({
    _id:
      "phase-14-7-controlled-installation",

    site:
      "phase-14-7-controlled-site",
  });
}


/*
|--------------------------------------------------------------------------
| Controlled telemetry fixture
|--------------------------------------------------------------------------
|
| Important:
|
| rawValue = 0 is intentionally preserved as a real value.
|
| rawValue = null represents missing telemetry and remains distinct from 0.
|
|--------------------------------------------------------------------------
*/

export function buildRuntimeTelemetryFixture(
  index = 0
) {
  const sequence =
    Number.isInteger(
      index
    )
      ? index
      : 0;

  let rawValue;

  switch (
    sequence %
    5
  ) {
    case 0:
      rawValue =
        0;
      break;

    case 1:
      rawValue =
        230 +
        (
          sequence %
          20
        );
      break;

    case 2:
      rawValue =
        String(
          48 +
          (
            sequence %
            10
          )
        );
      break;

    case 3:
      rawValue =
        null;
      break;

    default:
      rawValue =
        -1 *
        (
          sequence %
          7
        );
      break;
  }

  return {
    timestamp:
      1_700_000_000 +
      sequence,

    rawValue,

    description:
      "Controlled Phase 14.7 telemetry",

    code:
      `phase14_7_${sequence % 8}`,

    idDataAttribute:
      100 +
      (
        sequence %
        20
      ),

    Device:
      "CONTROLLED_FIXTURE",

    instance:
      String(
        sequence %
        4
      ),

    dbusServiceType:
      null,

    dbusPath:
      null,

    formatWithUnit:
      null,

    formattedValue:
      rawValue ===
        null
        ? null
        : String(
            rawValue
          ),
  };
}


/*
|--------------------------------------------------------------------------
| Memory snapshot
|--------------------------------------------------------------------------
*/

export function takeRuntimeMemorySnapshot(
  label =
    "snapshot"
) {
  const memory =
    process.memoryUsage();

  return Object.freeze({
    label,

    timestamp:
      new Date(),

    rssBytes:
      memory.rss,

    rssMb:
      bytesToMegabytes(
        memory.rss
      ),

    heapTotalBytes:
      memory.heapTotal,

    heapTotalMb:
      bytesToMegabytes(
        memory.heapTotal
      ),

    heapUsedBytes:
      memory.heapUsed,

    heapUsedMb:
      bytesToMegabytes(
        memory.heapUsed
      ),

    externalBytes:
      memory.external,

    externalMb:
      bytesToMegabytes(
        memory.external
      ),

    arrayBuffersBytes:
      memory.arrayBuffers,

    arrayBuffersMb:
      bytesToMegabytes(
        memory.arrayBuffers
      ),
  });
}


/*
|--------------------------------------------------------------------------
| Memory delta
|--------------------------------------------------------------------------
*/

export function calculateRuntimeMemoryDelta(
  before,
  after
) {
  return Object.freeze({
    rssBytes:
      after.rssBytes -
      before.rssBytes,

    rssMb:
      after.rssMb -
      before.rssMb,

    heapTotalBytes:
      after.heapTotalBytes -
      before.heapTotalBytes,

    heapTotalMb:
      after.heapTotalMb -
      before.heapTotalMb,

    heapUsedBytes:
      after.heapUsedBytes -
      before.heapUsedBytes,

    heapUsedMb:
      after.heapUsedMb -
      before.heapUsedMb,

    externalBytes:
      after.externalBytes -
      before.externalBytes,

    externalMb:
      after.externalMb -
      before.externalMb,

    arrayBuffersBytes:
      after.arrayBuffersBytes -
      before.arrayBuffersBytes,

    arrayBuffersMb:
      after.arrayBuffersMb -
      before.arrayBuffersMb,
  });
}


/*
|--------------------------------------------------------------------------
| Peak memory
|--------------------------------------------------------------------------
*/

export function calculateRuntimePeakMemory(
  snapshots = []
) {
  if (
    !Array.isArray(
      snapshots
    ) ||
    snapshots.length ===
      0
  ) {
    throw new TypeError(
      "At least one memory snapshot is required."
    );
  }

  return Object.freeze({
    rssBytes:
      Math.max(
        ...snapshots.map(
          (
            item
          ) =>
            item.rssBytes
        )
      ),

    rssMb:
      Math.max(
        ...snapshots.map(
          (
            item
          ) =>
            item.rssMb
        )
      ),

    heapTotalBytes:
      Math.max(
        ...snapshots.map(
          (
            item
          ) =>
            item.heapTotalBytes
        )
      ),

    heapTotalMb:
      Math.max(
        ...snapshots.map(
          (
            item
          ) =>
            item.heapTotalMb
        )
      ),

    heapUsedBytes:
      Math.max(
        ...snapshots.map(
          (
            item
          ) =>
            item.heapUsedBytes
        )
      ),

    heapUsedMb:
      Math.max(
        ...snapshots.map(
          (
            item
          ) =>
            item.heapUsedMb
        )
      ),

    externalBytes:
      Math.max(
        ...snapshots.map(
          (
            item
          ) =>
            item.externalBytes
        )
      ),

    externalMb:
      Math.max(
        ...snapshots.map(
          (
            item
          ) =>
            item.externalMb
        )
      ),

    arrayBuffersBytes:
      Math.max(
        ...snapshots.map(
          (
            item
          ) =>
            item.arrayBuffersBytes
        )
      ),

    arrayBuffersMb:
      Math.max(
        ...snapshots.map(
          (
            item
          ) =>
            item.arrayBuffersMb
        )
      ),
  });
}


/*
|--------------------------------------------------------------------------
| CPU measurement
|--------------------------------------------------------------------------
*/

export function calculateRuntimeCpuMeasurement({
  beforeCpu,
  afterCpu,
  wallDurationMs,
} = {}) {
  const userMicroseconds =
    afterCpu.user -
    beforeCpu.user;

  const systemMicroseconds =
    afterCpu.system -
    beforeCpu.system;

  const totalMicroseconds =
    userMicroseconds +
    systemMicroseconds;

  const userMs =
    userMicroseconds /
    1000;

  const systemMs =
    systemMicroseconds /
    1000;

  const totalMs =
    totalMicroseconds /
    1000;

  return Object.freeze({
    userMicroseconds,

    systemMicroseconds,

    totalMicroseconds,

    userMs,

    systemMs,

    totalMs,

    wallDurationMs,

    cpuToWallRatio:
      wallDurationMs >
      0
        ? totalMs /
          wallDurationMs
        : 0,
  });
}


/*
|--------------------------------------------------------------------------
| Bounded normalization helper
|--------------------------------------------------------------------------
|
| Output records are intentionally NOT retained.
|
| The objective is execution measurement rather than creation of another
| potentially large in-memory result set.
|
|--------------------------------------------------------------------------
*/

export function normalizeBoundedTelemetryBatch({
  startIndex,
  count,
  installation,
} = {}) {
  assertPositiveInteger(
    count,
    "count"
  );

  let normalized =
    0;

  let missing =
    0;

  let zero =
    0;

  for (
    let offset = 0;
    offset <
    count;
    offset +=
    1
  ) {
    const record =
      buildRuntimeTelemetryFixture(
        startIndex +
        offset
      );

    const result =
      normalizeTelemetryRecord({
        record,

        installation,

        device:
          null,
      });

    normalized +=
      1;

    if (
      result.quality ===
      "MISSING"
    ) {
      missing +=
        1;
    }

    if (
      result.numericValue ===
      0
    ) {
      zero +=
        1;
    }
  }

  return Object.freeze({
    normalized,

    missing,

    zero,
  });
}


/*
|--------------------------------------------------------------------------
| Single sustained cycle
|--------------------------------------------------------------------------
*/

export function runRuntimeSustainedCycle({
  cycleNumber,
  recordsPerCycle,
  batchSize,
  installation,
} = {}) {
  assertPositiveInteger(
    cycleNumber,
    "cycleNumber"
  );

  assertWithinLimit(
    recordsPerCycle,
    RUNTIME_SUSTAINED_LIMITS
      .maxRecordsPerCycle,
    "recordsPerCycle"
  );

  assertWithinLimit(
    batchSize,
    RUNTIME_SUSTAINED_LIMITS
      .maxBatchSize,
    "batchSize"
  );

  const beforeMemory =
    takeRuntimeMemorySnapshot(
      `cycle-${cycleNumber}-before`
    );

  const beforeCpu =
    process.cpuUsage();

  const start =
    performance.now();

  let normalized =
    0;

  let missing =
    0;

  let zero =
    0;

  for (
    let startIndex = 0;
    startIndex <
    recordsPerCycle;
    startIndex +=
    batchSize
  ) {
    const count =
      Math.min(
        batchSize,
        recordsPerCycle -
          startIndex
      );

    const batch =
      normalizeBoundedTelemetryBatch({
        startIndex:
          (
            cycleNumber -
            1
          ) *
            recordsPerCycle +
          startIndex,

        count,

        installation,
      });

    normalized +=
      batch.normalized;

    missing +=
      batch.missing;

    zero +=
      batch.zero;
  }

  const end =
    performance.now();

  const afterCpu =
    process.cpuUsage();

  const afterMemory =
    takeRuntimeMemorySnapshot(
      `cycle-${cycleNumber}-after`
    );

  const durationMs =
    end -
    start;

  return Object.freeze({
    cycleNumber,

    requested:
      recordsPerCycle,

    normalized,

    missing,

    zero,

    durationMs,

    memory: Object.freeze({
      before:
        beforeMemory,

      after:
        afterMemory,

      delta:
        calculateRuntimeMemoryDelta(
          beforeMemory,
          afterMemory
        ),
    }),

    cpu:
      calculateRuntimeCpuMeasurement({
        beforeCpu,

        afterCpu,

        wallDurationMs:
          durationMs,
      }),
  });
}


/*
|--------------------------------------------------------------------------
| Main sustained baseline
|--------------------------------------------------------------------------
*/

export async function runRuntimeSustainedBaseline({
  recordsPerCycle =
    RUNTIME_SUSTAINED_DEFAULTS
      .recordsPerCycle,

  cycles =
    RUNTIME_SUSTAINED_DEFAULTS
      .cycles,

  batchSize =
    RUNTIME_SUSTAINED_DEFAULTS
      .batchSize,
} = {}) {
  assertWithinLimit(
    recordsPerCycle,
    RUNTIME_SUSTAINED_LIMITS
      .maxRecordsPerCycle,
    "recordsPerCycle"
  );

  assertWithinLimit(
    cycles,
    RUNTIME_SUSTAINED_LIMITS
      .maxCycles,
    "cycles"
  );

  assertWithinLimit(
    batchSize,
    RUNTIME_SUSTAINED_LIMITS
      .maxBatchSize,
    "batchSize"
  );

  const installation =
    buildRuntimeInstallationFixture();

  const initialMemory =
    takeRuntimeMemorySnapshot(
      "sustained-before"
    );

  const beforeCpu =
    process.cpuUsage();

  const wallStart =
    performance.now();

  const cycleResults =
    [];

  for (
    let cycleNumber = 1;
    cycleNumber <=
    cycles;
    cycleNumber +=
    1
  ) {
    const result =
      runRuntimeSustainedCycle({
        cycleNumber,

        recordsPerCycle,

        batchSize,

        installation,
      });

    cycleResults.push(
      result
    );

    /*
     * Yield without changing production scheduler behavior.
     */
    await Promise.resolve();
  }

  const wallEnd =
    performance.now();

  const afterCpu =
    process.cpuUsage();

  const finalMemory =
    takeRuntimeMemorySnapshot(
      "sustained-after"
    );

  const memorySnapshots =
    [
      initialMemory,

      ...cycleResults.map(
        (
          item
        ) =>
          item.memory.after
      ),

      finalMemory,
    ];

  const peakMemory =
    calculateRuntimePeakMemory(
      memorySnapshots
    );

  const finalMemoryDelta =
    calculateRuntimeMemoryDelta(
      initialMemory,
      finalMemory
    );

  const wallDurationMs =
    wallEnd -
    wallStart;

  const cpu =
    calculateRuntimeCpuMeasurement({
      beforeCpu,

      afterCpu,

      wallDurationMs,
    });

  const durations =
    cycleResults.map(
      (
        item
      ) =>
        item.durationMs
    );

  const fastestCycleMs =
    Math.min(
      ...durations
    );

  const slowestCycleMs =
    Math.max(
      ...durations
    );

  const meanCycleMs =
    durations.reduce(
      (
        sum,
        value
      ) =>
        sum +
        value,
      0
    ) /
    durations.length;

  const totalNormalized =
    cycleResults.reduce(
      (
        sum,
        item
      ) =>
        sum +
        item.normalized,
      0
    );

  const totalMissing =
    cycleResults.reduce(
      (
        sum,
        item
      ) =>
        sum +
        item.missing,
      0
    );

  const totalZero =
    cycleResults.reduce(
      (
        sum,
        item
      ) =>
        sum +
        item.zero,
      0
    );

  return Object.freeze({
    phase:
      RUNTIME_SUSTAINED_PHASE,

    layer:
      RUNTIME_SUSTAINED_LAYER,

    category:
      RUNTIME_SUSTAINED_CATEGORY,

    measurement:
      RUNTIME_SUSTAINED_MEASUREMENT,

    controlled:
      true,

    productionEvidence:
      false,

    configuration:
      Object.freeze({
        recordsPerCycle,

        cycles,

        batchSize,

        totalRequested:
          recordsPerCycle *
          cycles,
      }),

    completion:
      Object.freeze({
        requestedCycles:
          cycles,

        completedCycles:
          cycleResults.length,

        allCyclesCompleted:
          cycleResults.length ===
          cycles,

        totalNormalized,

        totalMissing,

        totalZero,
      }),

    memory:
      Object.freeze({
        initial:
          initialMemory,

        final:
          finalMemory,

        peak:
          peakMemory,

        finalDelta:
          finalMemoryDelta,
      }),

    cpu,

    timing:
      Object.freeze({
        wallDurationMs,

        fastestCycleMs,

        slowestCycleMs,

        meanCycleMs,
      }),

    cycles:
      cycleResults,

    measurements:
      RUNTIME_SUSTAINED_MEASUREMENTS,

    boundaries:
      RUNTIME_SUSTAINED_BOUNDARIES,
  });
}


/*
|--------------------------------------------------------------------------
| Structural measurement integrity helper
|--------------------------------------------------------------------------
*/

export function isFiniteRuntimeSustainedResult(
  result
) {
  if (
    !result ||
    typeof result !==
      "object"
  ) {
    return false;
  }

  return (
    finiteNonNegative(
      result.memory
        ?.peak
        ?.rssBytes
    ) &&
    finiteNonNegative(
      result.memory
        ?.peak
        ?.heapUsedBytes
    ) &&
    finiteNonNegative(
      result.cpu
        ?.totalMs
    ) &&
    finiteNonNegative(
      result.timing
        ?.wallDurationMs
    )
  );
}