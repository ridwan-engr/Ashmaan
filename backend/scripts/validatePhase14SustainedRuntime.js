// scripts/validatePhase14SustainedRuntime.js

import assert from "node:assert/strict";

import {
  normalizeTelemetryRecord,
} from "../services/sync/telemetryNormalizer.js";

import {
  RUNTIME_SUSTAINED_PHASE,
  RUNTIME_SUSTAINED_LAYER,
  RUNTIME_SUSTAINED_CATEGORY,
  RUNTIME_SUSTAINED_MEASUREMENT,
  RUNTIME_SUSTAINED_DEFAULTS,
  RUNTIME_SUSTAINED_LIMITS,
  RUNTIME_SUSTAINED_MEASUREMENTS,
  RUNTIME_SUSTAINED_BOUNDARIES,

  buildRuntimeInstallationFixture,
  buildRuntimeTelemetryFixture,

  takeRuntimeMemorySnapshot,
  calculateRuntimeMemoryDelta,
  calculateRuntimePeakMemory,
  calculateRuntimeCpuMeasurement,

  normalizeBoundedTelemetryBatch,
  runRuntimeSustainedCycle,
  runRuntimeSustainedBaseline,
  isFiniteRuntimeSustainedResult,
} from "../services/performance/runtimeSustainedBaselineService.js";


let checks =
  0;


function pass(
  message
) {
  checks +=
    1;

  console.log(
    `PASS ${checks}: ${message}`
  );
}


function section(
  title
) {
  console.log(
    `\n--- ${title} ---`
  );
}


function check(
  condition,
  message
) {
  assert.equal(
    Boolean(
      condition
    ),
    true
  );

  pass(
    message
  );
}


function finite(
  value
) {
  return (
    typeof value ===
      "number" &&
    Number.isFinite(
      value
    )
  );
}


function finiteNonNegative(
  value
) {
  return (
    finite(
      value
    ) &&
    value >=
      0
  );
}


console.log(`
============================================================================
ASHMAAN PHASE 14.7 — SUSTAINED RUNTIME / REPEATED-WORKLOAD VALIDATION
============================================================================
`);


/*
|--------------------------------------------------------------------------
| A. Phase identity and contract
|--------------------------------------------------------------------------
*/

section(
  "A. Phase identity and contract"
);


assert.equal(
  RUNTIME_SUSTAINED_PHASE,
  "14.7"
);
pass(
  "phase identity is 14.7"
);


assert.equal(
  RUNTIME_SUSTAINED_LAYER,
  "RUNTIME_RESOURCE_BEHAVIOR"
);
pass(
  "layer identifies runtime resource behavior"
);


assert.equal(
  RUNTIME_SUSTAINED_CATEGORY,
  "SUSTAINED_REPEATED_WORKLOAD_STABILITY"
);
pass(
  "category identifies sustained repeated-workload stability"
);


assert.equal(
  RUNTIME_SUSTAINED_MEASUREMENT,
  "CONTROLLED_BOUNDED_IN_PROCESS"
);
pass(
  "measurement remains controlled, bounded, and in-process"
);


pass(
  "Phase 14.7 contract is frozen"
);


/*
|--------------------------------------------------------------------------
| B. Bounded sustained defaults
|--------------------------------------------------------------------------
*/

section(
  "B. Bounded sustained-runtime defaults"
);


assert.equal(
  RUNTIME_SUSTAINED_DEFAULTS
    .recordsPerCycle,
  5000
);
pass(
  "default sustained workload contains 5000 records per cycle"
);


assert.equal(
  RUNTIME_SUSTAINED_DEFAULTS
    .cycles,
  10
);
pass(
  "default sustained workload uses ten cycles"
);


assert.equal(
  RUNTIME_SUSTAINED_DEFAULTS
    .batchSize,
  250
);
pass(
  "default sustained batch size remains 250"
);


check(
  RUNTIME_SUSTAINED_LIMITS
    .maxRecordsPerCycle >
    RUNTIME_SUSTAINED_DEFAULTS
      .recordsPerCycle,
  "records-per-cycle has explicit upper bound"
);


check(
  RUNTIME_SUSTAINED_LIMITS
    .maxCycles >
    RUNTIME_SUSTAINED_DEFAULTS
      .cycles,
  "cycle count has explicit upper bound"
);


check(
  RUNTIME_SUSTAINED_LIMITS
    .maxBatchSize >
    RUNTIME_SUSTAINED_DEFAULTS
      .batchSize,
  "batch size has explicit upper bound"
);


/*
|--------------------------------------------------------------------------
| C. Measurement inventory
|--------------------------------------------------------------------------
*/

section(
  "C. Required sustained-runtime measurements"
);


for (
  const key
  of [
    "rss",
    "heapTotal",
    "heapUsed",
    "external",
    "arrayBuffers",
    "cpuUser",
    "cpuSystem",
    "wallClock",
    "cpuToWallRatio",
    "perCycleDuration",
    "fastestCycle",
    "slowestCycle",
    "meanCycleDuration",
  ]
) {
  assert.equal(
    RUNTIME_SUSTAINED_MEASUREMENTS[
      key
    ],
    true
  );

  pass(
    `${key} measurement is enabled`
  );
}


/*
|--------------------------------------------------------------------------
| D. Semantic boundaries
|--------------------------------------------------------------------------
*/

section(
  "D. Sustained measurement semantics"
);


assert.equal(
  RUNTIME_SUSTAINED_BOUNDARIES
    .controlledMeasurement,
  true
);
pass(
  "measurement is explicitly controlled"
);


assert.equal(
  RUNTIME_SUSTAINED_BOUNDARIES
    .boundedWorkload,
  true
);
pass(
  "workload is explicitly bounded"
);


assert.equal(
  RUNTIME_SUSTAINED_BOUNDARIES
    .productionNormalizerUsed,
  true
);
pass(
  "sustained workload uses production telemetry normalizer"
);


assert.equal(
  RUNTIME_SUSTAINED_BOUNDARIES
    .controlledFixtureIsProductionEvidence,
  false
);
pass(
  "controlled fixture is not represented as production evidence"
);


assert.equal(
  RUNTIME_SUSTAINED_BOUNDARIES
    .missingTelemetryMeansZero,
  false
);
pass(
  "missing telemetry remains distinct from zero"
);


assert.equal(
  RUNTIME_SUSTAINED_BOUNDARIES
    .unitInferenceAllowed,
  false
);
pass(
  "runtime measurement does not infer units"
);


assert.equal(
  RUNTIME_SUSTAINED_BOUNDARIES
    .topologyInferenceAllowed,
  false
);
pass(
  "runtime measurement does not infer topology"
);


assert.equal(
  RUNTIME_SUSTAINED_BOUNDARIES
    .arbitraryMemoryFailureThreshold,
  false
);
pass(
  "no arbitrary memory failure threshold is introduced"
);


assert.equal(
  RUNTIME_SUSTAINED_BOUNDARIES
    .arbitraryCpuFailureThreshold,
  false
);
pass(
  "no arbitrary CPU failure threshold is introduced"
);


assert.equal(
  RUNTIME_SUSTAINED_BOUNDARIES
    .negativeMemoryDeltaIsFailure,
  false
);
pass(
  "negative memory delta is not automatically a failure"
);


/*
|--------------------------------------------------------------------------
| E. Safety boundary
|--------------------------------------------------------------------------
*/

section(
  "E. Sustained-runtime safety boundary"
);


const disabledBoundaries =
  [
    [
      "performsVrmRequest",
      "performsVrmRequest remains disabled",
    ],
    [
      "performsDatabaseRead",
      "performsDatabaseRead remains disabled",
    ],
    [
      "performsDatabaseWrite",
      "performsDatabaseWrite remains disabled",
    ],
    [
      "startsProductionScheduler",
      "startsProductionScheduler remains disabled",
    ],
    [
      "changesSchedulerConfiguration",
      "changesSchedulerConfiguration remains disabled",
    ],
    [
      "changesRuntimeConfiguration",
      "changesRuntimeConfiguration remains disabled",
    ],
    [
      "forcesGarbageCollection",
      "forcesGarbageCollection remains disabled",
    ],
    [
      "createsUnboundedQueue",
      "createsUnboundedQueue remains disabled",
    ],
    [
      "createsUnboundedAllocation",
      "createsUnboundedAllocation remains disabled",
    ],
    [
      "changesAuthentication",
      "changesAuthentication remains disabled",
    ],
    [
      "changesAuthorization",
      "changesAuthorization remains disabled",
    ],
    [
      "performsEquipmentControl",
      "performsEquipmentControl remains disabled",
    ],
    [
      "performsAutoDispatch",
      "performsAutoDispatch remains disabled",
    ],
  ];


for (
  const [
    key,
    message,
  ]
  of disabledBoundaries
) {
  assert.equal(
    RUNTIME_SUSTAINED_BOUNDARIES[
      key
    ],
    false
  );

  pass(
    message
  );
}


/*
|--------------------------------------------------------------------------
| F. Production-normalizer evidence
|--------------------------------------------------------------------------
*/

section(
  "F. Production-normalizer execution evidence"
);


assert.equal(
  typeof normalizeTelemetryRecord,
  "function"
);
pass(
  "production telemetry normalizer exists"
);


assert.equal(
  typeof normalizeBoundedTelemetryBatch,
  "function"
);
pass(
  "bounded sustained normalization helper exists"
);


const installation =
  buildRuntimeInstallationFixture();


const zeroRecord =
  buildRuntimeTelemetryFixture(
    0
  );

const zeroNormalized =
  normalizeTelemetryRecord({
    record:
      zeroRecord,

    installation,

    device:
      null,
  });


assert.equal(
  zeroNormalized.numericValue,
  0
);
pass(
  "production normalizer preserves numeric zero"
);


const missingRecord =
  buildRuntimeTelemetryFixture(
    3
  );

const missingNormalized =
  normalizeTelemetryRecord({
    record:
      missingRecord,

    installation,

    device:
      null,
  });


assert.equal(
  missingNormalized
    .numericValue,
  null
);
pass(
  "production normalizer preserves missing value as null"
);


assert.equal(
  missingNormalized
    .quality,
  "MISSING"
);
pass(
  "missing telemetry is explicitly classified as MISSING"
);


assert.notEqual(
  missingNormalized
    .numericValue,
  zeroNormalized
    .numericValue
);
pass(
  "missing telemetry remains distinct from zero after normalization"
);


/*
|--------------------------------------------------------------------------
| G. Input bounds
|--------------------------------------------------------------------------
*/

section(
  "G. Sustained workload bound enforcement"
);


assert.throws(
  () =>
    normalizeBoundedTelemetryBatch({
      startIndex:
        0,

      count:
        0,

      installation,
    }),
  TypeError
);
pass(
  "zero-sized normalization batch is rejected"
);


assert.throws(
  () =>
    runRuntimeSustainedCycle({
      cycleNumber:
        1,

      recordsPerCycle:
        RUNTIME_SUSTAINED_LIMITS
          .maxRecordsPerCycle +
        1,

      batchSize:
        250,

      installation,
    }),
  RangeError
);
pass(
  "records-per-cycle above explicit safety limit is rejected"
);


assert.throws(
  () =>
    runRuntimeSustainedCycle({
      cycleNumber:
        1,

      recordsPerCycle:
        100,

      batchSize:
        RUNTIME_SUSTAINED_LIMITS
          .maxBatchSize +
        1,

      installation,
    }),
  RangeError
);
pass(
  "batch size above explicit safety limit is rejected"
);


/*
|--------------------------------------------------------------------------
| H. Memory helper behavior
|--------------------------------------------------------------------------
*/

section(
  "H. Memory helper behavior"
);


const snapshot =
  takeRuntimeMemorySnapshot(
    "validation"
  );


assert.equal(
  snapshot.label,
  "validation"
);
pass(
  "memory snapshot preserves explicit label"
);


check(
  snapshot.timestamp instanceof
    Date,
  "memory snapshot contains timestamp"
);


for (
  const key
  of [
    "rssBytes",
    "rssMb",
    "heapTotalBytes",
    "heapTotalMb",
    "heapUsedBytes",
    "heapUsedMb",
    "externalBytes",
    "externalMb",
    "arrayBuffersBytes",
    "arrayBuffersMb",
  ]
) {
  check(
    finiteNonNegative(
      snapshot[
        key
      ]
    ),
    `${key} memory measurement is finite and non-negative`
  );
}


check(
  snapshot.heapUsedBytes <=
    snapshot.heapTotalBytes,
  "reported heap used does not exceed heap total"
);


/*
|--------------------------------------------------------------------------
| I. Memory delta semantics
|--------------------------------------------------------------------------
*/

section(
  "I. Memory delta semantics"
);


const syntheticBefore =
  {
    rssBytes:
      100,

    rssMb:
      100,

    heapTotalBytes:
      100,

    heapTotalMb:
      100,

    heapUsedBytes:
      100,

    heapUsedMb:
      100,

    externalBytes:
      100,

    externalMb:
      100,

    arrayBuffersBytes:
      100,

    arrayBuffersMb:
      100,
  };


const syntheticAfter =
  {
    rssBytes:
      125,

    rssMb:
      125,

    heapTotalBytes:
      110,

    heapTotalMb:
      110,

    heapUsedBytes:
      90,

    heapUsedMb:
      90,

    externalBytes:
      105,

    externalMb:
      105,

    arrayBuffersBytes:
      103,

    arrayBuffersMb:
      103,
  };


const delta =
  calculateRuntimeMemoryDelta(
    syntheticBefore,
    syntheticAfter
  );


assert.equal(
  delta.rssBytes,
  25
);
pass(
  "memory delta calculates positive RSS change"
);


assert.equal(
  delta.heapTotalBytes,
  10
);
pass(
  "memory delta calculates heap-total change"
);


assert.equal(
  delta.heapUsedBytes,
  -10
);
pass(
  "memory delta preserves negative heap-used change"
);


assert.equal(
  delta.externalBytes,
  5
);
pass(
  "memory delta calculates external-memory change"
);


assert.equal(
  delta.arrayBuffersBytes,
  3
);
pass(
  "memory delta calculates ArrayBuffer change"
);


/*
|--------------------------------------------------------------------------
| J. Peak calculation
|--------------------------------------------------------------------------
*/

section(
  "J. Peak memory calculation"
);


const peak =
  calculateRuntimePeakMemory([
    syntheticBefore,
    syntheticAfter,
  ]);


assert.equal(
  peak.rssBytes,
  125
);
pass(
  "peak calculator preserves maximum RSS"
);


assert.equal(
  peak.heapTotalBytes,
  110
);
pass(
  "peak calculator preserves maximum heap total"
);


assert.equal(
  peak.heapUsedBytes,
  100
);
pass(
  "peak calculator preserves maximum heap used"
);


assert.equal(
  peak.externalBytes,
  105
);
pass(
  "peak calculator preserves maximum external memory"
);


assert.equal(
  peak.arrayBuffersBytes,
  103
);
pass(
  "peak calculator preserves maximum ArrayBuffer memory"
);


/*
|--------------------------------------------------------------------------
| K. CPU helper
|--------------------------------------------------------------------------
*/

section(
  "K. CPU measurement calculation"
);


const cpu =
  calculateRuntimeCpuMeasurement({
    beforeCpu: {
      user:
        1000,

      system:
        500,
    },

    afterCpu: {
      user:
        6000,

      system:
        2500,
    },

    wallDurationMs:
      10,
  });


assert.equal(
  cpu.userMicroseconds,
  5000
);
pass(
  "CPU helper calculates user CPU difference"
);


assert.equal(
  cpu.systemMicroseconds,
  2000
);
pass(
  "CPU helper calculates system CPU difference"
);


assert.equal(
  cpu.totalMicroseconds,
  7000
);
pass(
  "CPU helper reconciles total CPU microseconds"
);


assert.equal(
  cpu.userMs,
  5
);
pass(
  "CPU helper converts user time to milliseconds"
);


assert.equal(
  cpu.systemMs,
  2
);
pass(
  "CPU helper converts system time to milliseconds"
);


assert.equal(
  cpu.totalMs,
  7
);
pass(
  "CPU helper reports total CPU milliseconds"
);


assert.equal(
  cpu.cpuToWallRatio,
  0.7
);
pass(
  "CPU-to-wall ratio is calculated without SLA judgment"
);


/*
|--------------------------------------------------------------------------
| L. Controlled single cycle
|--------------------------------------------------------------------------
*/

section(
  "L. Controlled single-cycle execution"
);


const singleCycle =
  runRuntimeSustainedCycle({
    cycleNumber:
      1,

    recordsPerCycle:
      500,

    batchSize:
      100,

    installation,
  });


assert.equal(
  singleCycle
    .cycleNumber,
  1
);
pass(
  "single cycle preserves cycle number"
);


assert.equal(
  singleCycle.requested,
  500
);
pass(
  "single cycle preserves requested record count"
);


assert.equal(
  singleCycle.normalized,
  500
);
pass(
  "single cycle normalizes exactly requested records"
);


check(
  singleCycle.missing >
    0,
  "single cycle preserves explicit missing telemetry"
);


check(
  singleCycle.zero >
    0,
  "single cycle preserves explicit zero telemetry"
);


check(
  finite(
    singleCycle.durationMs
  ) &&
    singleCycle.durationMs >
      0,
  "single-cycle duration is finite and positive"
);


check(
  finiteNonNegative(
    singleCycle.memory
      .after
      .rssBytes
  ),
  "single cycle reports finite RSS"
);


check(
  finiteNonNegative(
    singleCycle.memory
      .after
      .heapUsedBytes
  ),
  "single cycle reports finite heap usage"
);


check(
  finiteNonNegative(
    singleCycle.cpu
      .totalMs
  ),
  "single cycle reports finite CPU usage"
);


/*
|--------------------------------------------------------------------------
| M. Full sustained baseline
|--------------------------------------------------------------------------
*/

section(
  "M. Controlled sustained-runtime baseline"
);


const result =
  await runRuntimeSustainedBaseline();


assert.equal(
  result.phase,
  "14.7"
);
pass(
  "sustained baseline identifies Phase 14.7"
);


assert.equal(
  result.layer,
  "RUNTIME_RESOURCE_BEHAVIOR"
);
pass(
  "sustained baseline identifies resource-behavior layer"
);


assert.equal(
  result.category,
  "SUSTAINED_REPEATED_WORKLOAD_STABILITY"
);
pass(
  "sustained baseline identifies sustained-runtime category"
);


assert.equal(
  result.measurement,
  "CONTROLLED_BOUNDED_IN_PROCESS"
);
pass(
  "sustained baseline remains controlled bounded in-process measurement"
);


assert.equal(
  result.controlled,
  true
);
pass(
  "sustained baseline is explicitly controlled"
);


assert.equal(
  result.productionEvidence,
  false
);
pass(
  "controlled sustained baseline is not represented as live production evidence"
);


assert.equal(
  result.configuration
    .recordsPerCycle,
  5000
);
pass(
  "sustained baseline uses 5000 records per cycle"
);


assert.equal(
  result.configuration
    .cycles,
  10
);
pass(
  "sustained baseline uses ten cycles"
);


assert.equal(
  result.configuration
    .batchSize,
  250
);
pass(
  "sustained baseline uses bounded batch size 250"
);


assert.equal(
  result.configuration
    .totalRequested,
  50_000
);
pass(
  "sustained baseline requests exactly 50000 normalization operations"
);


assert.equal(
  result.completion
    .totalNormalized,
  50_000
);
pass(
  "sustained baseline performs exactly 50000 normalization operations"
);


assert.equal(
  result.cycles.length,
  10
);
pass(
  "sustained baseline returns exactly ten cycle results"
);


assert.equal(
  result.completion
    .completedCycles,
  10
);
pass(
  "all ten sustained cycles complete"
);


assert.equal(
  result.completion
    .allCyclesCompleted,
  true
);
pass(
  "sustained-runtime completion reconciliation succeeds"
);


/*
|--------------------------------------------------------------------------
| N. Per-cycle behavior
|--------------------------------------------------------------------------
*/

section(
  "N. Per-cycle sustained behavior"
);


for (
  let index = 0;
  index <
  result.cycles.length;
  index +=
  1
) {
  const cycle =
    result.cycles[
      index
    ];

  const number =
    index +
    1;

  assert.equal(
    cycle.cycleNumber,
    number
  );
  pass(
    `cycle ${number} preserves cycle identity`
  );


  assert.equal(
    cycle.requested,
    5000
  );
  pass(
    `cycle ${number} requested exactly 5000 records`
  );


  assert.equal(
    cycle.normalized,
    5000
  );
  pass(
    `cycle ${number} normalized exactly 5000 records`
  );


  check(
    finite(
      cycle.durationMs
    ) &&
      cycle.durationMs >
        0,
    `cycle ${number} duration is finite and positive`
  );


  check(
    finiteNonNegative(
      cycle.memory
        .after
        .rssBytes
    ),
    `cycle ${number} reports finite RSS`
  );


  check(
    finiteNonNegative(
      cycle.memory
        .after
        .heapUsedBytes
    ),
    `cycle ${number} reports finite heap usage`
  );


  check(
    finiteNonNegative(
      cycle.cpu
        .totalMs
    ),
    `cycle ${number} reports finite CPU time`
  );
}


/*
|--------------------------------------------------------------------------
| O. Aggregate memory evidence
|--------------------------------------------------------------------------
*/

section(
  "O. Aggregate sustained-memory evidence"
);


check(
  finiteNonNegative(
    result.memory
      .initial
      .rssBytes
  ),
  "initial RSS is finite and non-negative"
);


check(
  finiteNonNegative(
    result.memory
      .final
      .rssBytes
  ),
  "final RSS is finite and non-negative"
);


check(
  finiteNonNegative(
    result.memory
      .peak
      .rssBytes
  ),
  "peak RSS is finite and non-negative"
);


check(
  result.memory
    .peak
    .rssBytes >=
    result.memory
      .initial
      .rssBytes,
  "peak RSS is not below initial observation"
);


check(
  finite(
    result.memory
      .finalDelta
      .rssBytes
  ),
  "final RSS delta is finite"
);


check(
  finiteNonNegative(
    result.memory
      .peak
      .heapUsedBytes
  ),
  "peak heap usage is finite and non-negative"
);


check(
  result.memory
    .peak
    .heapUsedBytes >=
    result.memory
      .initial
      .heapUsedBytes,
  "peak heap usage is not below initial observation"
);


check(
  finite(
    result.memory
      .finalDelta
      .heapUsedBytes
  ),
  "final heap-used delta is finite"
);


/*
|--------------------------------------------------------------------------
| P. Aggregate CPU / timing evidence
|--------------------------------------------------------------------------
*/

section(
  "P. Aggregate CPU and timing evidence"
);


check(
  finiteNonNegative(
    result.cpu
      .userMs
  ),
  "aggregate user CPU time is finite and non-negative"
);


check(
  finiteNonNegative(
    result.cpu
      .systemMs
  ),
  "aggregate system CPU time is finite and non-negative"
);


check(
  finiteNonNegative(
    result.cpu
      .totalMs
  ),
  "aggregate total CPU time is finite and non-negative"
);


assert.equal(
  result.cpu.totalMs,
  result.cpu.userMs +
    result.cpu.systemMs
);
pass(
  "aggregate CPU total reconciles user plus system time"
);


check(
  finite(
    result.timing
      .wallDurationMs
  ) &&
    result.timing
      .wallDurationMs >
      0,
  "aggregate wall-clock duration is finite and positive"
);


check(
  finiteNonNegative(
    result.cpu
      .cpuToWallRatio
  ),
  "aggregate CPU-to-wall ratio is finite and non-negative"
);


check(
  finite(
    result.timing
      .fastestCycleMs
  ) &&
    result.timing
      .fastestCycleMs >
      0,
  "fastest-cycle duration is finite and positive"
);


check(
  finite(
    result.timing
      .slowestCycleMs
  ) &&
    result.timing
      .slowestCycleMs >
      0,
  "slowest-cycle duration is finite and positive"
);


check(
  result.timing
    .fastestCycleMs <=
    result.timing
      .slowestCycleMs,
  "fastest cycle does not exceed slowest cycle"
);


check(
  finite(
    result.timing
      .meanCycleMs
  ) &&
    result.timing
      .meanCycleMs >
      0,
  "mean-cycle duration is finite and positive"
);


/*
|--------------------------------------------------------------------------
| Q. Structural result integrity
|--------------------------------------------------------------------------
*/

section(
  "Q. Sustained-result integrity"
);


assert.equal(
  isFiniteRuntimeSustainedResult(
    result
  ),
  true
);
pass(
  "sustained-runtime result contains finite core resource observations"
);


assert.equal(
  result.completion
    .totalNormalized,
  result.configuration
    .recordsPerCycle *
    result.configuration
      .cycles
);
pass(
  "normalization accounting reconciles records-per-cycle multiplied by cycles"
);


assert.equal(
  result.cycles.reduce(
    (
      total,
      cycle
    ) =>
      total +
      cycle.normalized,
    0
  ),
  50_000
);
pass(
  "per-cycle normalization accounting reconciles to aggregate total"
);


/*
|--------------------------------------------------------------------------
| R. Final safety confirmation
|--------------------------------------------------------------------------
*/

section(
  "R. Final sustained-runtime safety confirmation"
);


assert.equal(
  result.boundaries
    .performsVrmRequest,
  false
);
pass(
  "sustained baseline performs no VRM request"
);


assert.equal(
  result.boundaries
    .performsDatabaseRead,
  false
);
pass(
  "sustained baseline performs no database read"
);


assert.equal(
  result.boundaries
    .performsDatabaseWrite,
  false
);
pass(
  "sustained baseline performs no database write"
);


assert.equal(
  result.boundaries
    .startsProductionScheduler,
  false
);
pass(
  "sustained baseline does not start production scheduler"
);


assert.equal(
  result.boundaries
    .forcesGarbageCollection,
  false
);
pass(
  "sustained baseline does not force garbage collection"
);


assert.equal(
  result.boundaries
    .createsUnboundedQueue,
  false
);
pass(
  "sustained baseline creates no unbounded queue"
);


assert.equal(
  result.boundaries
    .createsUnboundedAllocation,
  false
);
pass(
  "sustained baseline creates no unbounded allocation"
);


assert.equal(
  result.boundaries
    .performsEquipmentControl,
  false
);
pass(
  "sustained baseline performs no equipment control"
);


assert.equal(
  result.boundaries
    .performsAutoDispatch,
  false
);
pass(
  "sustained baseline performs no automatic dispatch"
);


/*
|--------------------------------------------------------------------------
| S. Measured baseline
|--------------------------------------------------------------------------
*/

section(
  "S. Measured sustained-runtime baseline"
);


console.log(`
Records / cycle       : ${result.configuration.recordsPerCycle}
Cycles                : ${result.configuration.cycles}
Batch size            : ${result.configuration.batchSize}
Total normalized      : ${result.completion.totalNormalized}

Initial RSS           : ${result.memory.initial.rssMb.toFixed(6)} MB
Final RSS             : ${result.memory.final.rssMb.toFixed(6)} MB
Peak RSS              : ${result.memory.peak.rssMb.toFixed(6)} MB
RSS delta             : ${result.memory.finalDelta.rssMb.toFixed(6)} MB

Initial heap used     : ${result.memory.initial.heapUsedMb.toFixed(6)} MB
Final heap used       : ${result.memory.final.heapUsedMb.toFixed(6)} MB
Peak heap used        : ${result.memory.peak.heapUsedMb.toFixed(6)} MB
Heap-used delta       : ${result.memory.finalDelta.heapUsedMb.toFixed(6)} MB

CPU user              : ${result.cpu.userMs.toFixed(3)} ms
CPU system            : ${result.cpu.systemMs.toFixed(3)} ms
CPU total             : ${result.cpu.totalMs.toFixed(3)} ms
Wall duration         : ${result.timing.wallDurationMs.toFixed(3)} ms
CPU / wall ratio      : ${result.cpu.cpuToWallRatio.toFixed(6)}

Fastest cycle         : ${result.timing.fastestCycleMs.toFixed(3)} ms
Slowest cycle         : ${result.timing.slowestCycleMs.toFixed(3)} ms
Mean cycle            : ${result.timing.meanCycleMs.toFixed(3)} ms
`);


for (
  const cycle
  of result.cycles
) {
  console.log(
    `Cycle ${cycle.cycleNumber}`.padEnd(
      22
    ) +
    `: ${cycle.durationMs.toFixed(3)} ms | ` +
    `RSS ${cycle.memory.after.rssMb.toFixed(6)} MB | ` +
    `Heap ${cycle.memory.after.heapUsedMb.toFixed(6)} MB`
  );
}


console.log(`
----------------------------------------------------------------------------
PHASE 14.7 SUSTAINED RUNTIME / REPEATED-WORKLOAD RESULT
----------------------------------------------------------------------------
Cycles completed              : ${result.completion.completedCycles}/${result.completion.requestedCycles}
Total normalized              : ${result.completion.totalNormalized}
Peak RSS                      : ${result.memory.peak.rssMb.toFixed(6)} MB
Peak heap used                : ${result.memory.peak.heapUsedMb.toFixed(6)} MB
Final RSS delta               : ${result.memory.finalDelta.rssMb.toFixed(6)} MB
Final heap-used delta         : ${result.memory.finalDelta.heapUsedMb.toFixed(6)} MB
CPU total                     : ${result.cpu.totalMs.toFixed(3)} ms
CPU / wall ratio              : ${result.cpu.cpuToWallRatio.toFixed(6)}
Fastest cycle                 : ${result.timing.fastestCycleMs.toFixed(3)} ms
Slowest cycle                 : ${result.timing.slowestCycleMs.toFixed(3)} ms
Mean cycle                    : ${result.timing.meanCycleMs.toFixed(3)} ms
Arbitrary memory SLA          : NONE
Arbitrary CPU SLA             : NONE
Forced garbage collection     : NO
Database mutation             : NONE
VRM request                   : NONE
Production scheduler          : NOT STARTED
Equipment control             : NONE
Auto-dispatch                 : DISABLED
----------------------------------------------------------------------------
`);


console.log(
  `Assertions passed: ${checks}`
);

console.log(
  "ASHMAAN PHASE 14.7 SUSTAINED RUNTIME / REPEATED-WORKLOAD VALIDATION PASSED"
);