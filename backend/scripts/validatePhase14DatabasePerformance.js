// ============================================================================
// ASHMAAN PHASE 14.3 — DATABASE QUERY / INDEX PERFORMANCE VALIDATION
// ============================================================================

import "dotenv/config";

import assert from "node:assert/strict";
import dns from "node:dns";

import databasePerformanceContract, {
  runDatabasePerformanceBaseline,
  selectRelevantCollections,
} from "../services/performance/databasePerformanceBaselineService.js";

dns.setServers([
  "8.8.8.8",
  "1.1.1.1",
]);

let assertionsPassed = 0;

function check(
  condition,
  message
) {
  assert.ok(
    condition,
    message
  );

  assertionsPassed += 1;

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
  return Number.isFinite(value)
    ? `${value.toFixed(3)} ms`
    : "N/A";
}

console.log("");
console.log(
  "=".repeat(72)
);

console.log(
  "ASHMAAN PHASE 14.3 — DATABASE QUERY / INDEX PERFORMANCE VALIDATION"
);

console.log(
  "=".repeat(72)
);

try {
  // -------------------------------------------------------------------------
  // A. Contract
  // -------------------------------------------------------------------------

  section(
    "A. Phase identity and contract"
  );

  check(
    databasePerformanceContract.phase ===
      "14.3",
    "phase identity is 14.3"
  );

  check(
    databasePerformanceContract.layer ===
      "DATABASE_QUERY_INDEX_PERFORMANCE",
    "layer identity is DATABASE_QUERY_INDEX_PERFORMANCE"
  );

  check(
    databasePerformanceContract.category ===
      "DATABASE_PERFORMANCE_BASELINE",
    "category identifies database performance baseline"
  );

  check(
    databasePerformanceContract.mode ===
      "READ_ONLY_MEASUREMENT",
    "14.3 is read-only measurement"
  );

  check(
    Object.isFrozen(
      databasePerformanceContract
    ),
    "database performance contract is frozen"
  );

  // -------------------------------------------------------------------------
  // B. Bounded defaults
  // -------------------------------------------------------------------------

  section(
    "B. Bounded database measurement defaults"
  );

  const defaults =
    databasePerformanceContract.defaults;

  check(
    defaults.maxSelectedCollections ===
      8,
    "collection inspection is bounded to eight selected collections"
  );

  check(
    defaults.queryLimit ===
      25,
    "representative query result limit is bounded at 25"
  );

  check(
    defaults.maxTimeMs ===
      5_000,
    "database query maxTimeMS is finite at 5000 ms"
  );

  check(
    defaults.maxPoolSize ===
      3,
    "validator database pool is bounded to three connections"
  );

  check(
    defaults.minPoolSize ===
      0,
    "validator requires no persistent minimum database pool"
  );

  check(
    defaults.serverSelectionTimeoutMS ===
      10_000,
    "server selection timeout is finite"
  );

  check(
    defaults.connectTimeoutMS ===
      10_000,
    "database connect timeout is finite"
  );

  check(
    defaults.socketTimeoutMS ===
      15_000,
    "database socket timeout is finite"
  );

  // -------------------------------------------------------------------------
  // C. Collection-selection helper
  // -------------------------------------------------------------------------

  section(
    "C. Relevant collection selection"
  );

  const selection =
    selectRelevantCollections(
      [
        "users",
        "telemetry",
        "forecasts",
        "outageevents",
        "financialrecords",
        "other",
      ],
      4
    );

  check(
    selection.length ===
      4,
    "collection selection obeys explicit maximum"
  );

  check(
    selection.every(
      (name) =>
        typeof name ===
        "string"
    ),
    "selected collection names are strings"
  );

  check(
    selection.includes(
      "telemetry"
    ),
    "telemetry collection is recognized as engineering-relevant"
  );

  check(
    selection.includes(
      "forecasts"
    ),
    "forecast collection is recognized as engineering-relevant"
  );

  let invalidSelectionRejected =
    false;

  try {
    selectRelevantCollections(
      ["telemetry"],
      0
    );
  } catch {
    invalidSelectionRejected =
      true;
  }

  check(
    invalidSelectionRejected,
    "invalid unbounded collection-selection configuration is rejected"
  );

  // -------------------------------------------------------------------------
  // D. Mutation safety
  // -------------------------------------------------------------------------

  section(
    "D. Database mutation safety boundary"
  );

  const boundary =
    databasePerformanceContract
      .executionBoundary;

  check(
    boundary.performsDocumentInsert ===
      false,
    "14.3 performs no document inserts"
  );

  check(
    boundary.performsDocumentUpdate ===
      false,
    "14.3 performs no document updates"
  );

  check(
    boundary.performsDocumentDelete ===
      false,
    "14.3 performs no document deletes"
  );

  check(
    boundary.performsIndexCreate ===
      false,
    "14.3 performs no index creation"
  );

  check(
    boundary.performsIndexDrop ===
      false,
    "14.3 performs no index deletion"
  );

  check(
    boundary.performsCollectionDrop ===
      false,
    "14.3 performs no collection deletion"
  );

  check(
    boundary.performsRetentionMutation ===
      false,
    "14.3 performs no retention-policy mutation"
  );

  check(
    boundary.performsDatabaseMutation ===
      false,
    "14.3 is database read-only"
  );

  check(
    boundary.performsUnboundedScan ===
      false,
    "14.3 performs no intentional unbounded production scan"
  );

  check(
    boundary.performsEquipmentControl ===
      false,
    "14.3 performs no equipment control"
  );

  check(
    boundary.performsAutoDispatch ===
      false,
    "14.3 performs no automatic dispatch"
  );

  // -------------------------------------------------------------------------
  // E. Environment
  // -------------------------------------------------------------------------

  section(
    "E. Database environment readiness"
  );

  check(
    typeof process.env
      .MONGODB_URI ===
      "string" &&
      process.env
        .MONGODB_URI
        .trim() !== "",
    "MONGODB_URI is available without exposing its value"
  );

  // -------------------------------------------------------------------------
  // F. Execute live read-only baseline
  // -------------------------------------------------------------------------

  section(
    "F. Live database performance baseline"
  );

  const baseline =
    await runDatabasePerformanceBaseline();

  check(
    baseline.phase ===
      "14.3",
    "live baseline identifies Phase 14.3"
  );

  check(
    baseline.layer ===
      "DATABASE_QUERY_INDEX_PERFORMANCE",
    "live baseline identifies database performance layer"
  );

  check(
    baseline.mode ===
      "READ_ONLY_MEASUREMENT",
    "live baseline remains read-only"
  );

  check(
    baseline.connected ===
      true,
    "read-only performance connection reached MongoDB"
  );

  check(
    Number.isInteger(
      baseline.totalCollectionCount
    ) &&
      baseline.totalCollectionCount >
        0,
    "database contains at least one collection"
  );

  check(
    baseline.selectedCollectionCount >
      0,
    "at least one relevant collection was selected"
  );

  check(
    baseline.selectedCollectionCount <=
      8,
    "selected collection count remained bounded"
  );

  check(
    baseline.results.length ===
      baseline.selectedCollectionCount,
    "every selected collection produced a performance result"
  );

  check(
    baseline.queryLimit ===
      25,
    "live query limit remained bounded at 25"
  );

  check(
    baseline.maxTimeMs ===
      5_000,
    "live maxTimeMS remained bounded at 5000 ms"
  );

  check(
    baseline.maxPoolSize ===
      3,
    "live inspection pool remained bounded"
  );

  // -------------------------------------------------------------------------
  // G. Index inventory integrity
  // -------------------------------------------------------------------------

  section(
    "G. Index inventory integrity"
  );

  check(
    Number.isInteger(
      baseline.summary
        .totalIndexes
    ) &&
      baseline.summary
        .totalIndexes >=
        baseline.selectedCollectionCount,
    "selected collections expose at least their mandatory index inventory"
  );

  check(
    baseline.summary
      .collectionsWithIdIndex ===
      baseline.selectedCollectionCount,
    "all selected collections expose an _id index"
  );

  check(
    Number.isInteger(
      baseline.summary
        .ttlIndexCount
    ) &&
      baseline.summary
        .ttlIndexCount >= 0,
    "TTL index inventory is measured without mutation"
  );

  // -------------------------------------------------------------------------
  // H. Bounded query-plan measurements
  // -------------------------------------------------------------------------

  section(
    "H. Bounded query-plan measurements"
  );

  for (
    const result
    of baseline.results
  ) {
    const name =
      result.collectionName;

    const indexes =
      result.indexInspection;

    const query =
      result.queryMeasurement;

    check(
      indexes.indexCount >=
        1,
      `${name} exposes at least one index`
    );

    check(
      indexes.hasIdIndex ===
        true,
      `${name} exposes the mandatory _id index`
    );

    check(
      Number.isFinite(
        indexes.inspectionMs
      ) &&
        indexes.inspectionMs >=
          0,
      `${name} index inspection latency is finite`
    );

    check(
      query.queryLimit ===
        25,
      `${name} query result limit remained 25`
    );

    check(
      query.maxTimeMs ===
        5_000,
      `${name} query maxTimeMS remained 5000 ms`
    );

    check(
      query.queryShape ===
        "find({}).project({_id:1}).sort({_id:-1}).limit(N)",
      `${name} used the controlled read-only baseline query shape`
    );

    check(
      Number.isFinite(
        query.wallClockMs
      ) &&
        query.wallClockMs >=
          0,
      `${name} wall-clock query latency is finite`
    );

    check(
      query.hasCollectionScan ===
        false,
      `${name} controlled _id query avoided COLLSCAN`
    );

    check(
      query.hasIndexedStage ===
        true,
      `${name} controlled query used an indexed execution stage`
    );

    check(
      query.nReturned == null ||
        (
          Number.isFinite(
            query.nReturned
          ) &&
          query.nReturned <=
            25
        ),
      `${name} returned no more than the bounded query limit`
    );

    check(
      query.totalDocsExamined ==
        null ||
        (
          Number.isFinite(
            query.totalDocsExamined
          ) &&
          query.totalDocsExamined >=
            0
        ),
      `${name} documents-examined metric is valid`
    );

    check(
      query.totalKeysExamined ==
        null ||
        (
          Number.isFinite(
            query.totalKeysExamined
          ) &&
          query.totalKeysExamined >=
            0
        ),
      `${name} keys-examined metric is valid`
    );
  }

  // -------------------------------------------------------------------------
  // I. Aggregate query evidence
  // -------------------------------------------------------------------------

  section(
    "I. Aggregate database performance evidence"
  );

  check(
    baseline.summary
      .collectionsWithCollectionScan ===
      0,
    "controlled baseline produced no collection scans"
  );

  check(
    baseline.summary
      .collectionsWithIndexedPlan ===
      baseline.selectedCollectionCount,
    "all controlled baseline queries used indexed plans"
  );

  // -------------------------------------------------------------------------
  // J. Report
  // -------------------------------------------------------------------------

  section(
    "J. Measured database baseline"
  );

  console.log("");
  console.log(
    `Total DB collections     : ${baseline.totalCollectionCount}`
  );

  console.log(
    `Selected collections     : ${baseline.selectedCollectionCount}`
  );

  console.log(
    `Total selected indexes   : ${baseline.summary.totalIndexes}`
  );

  console.log(
    `TTL indexes observed     : ${baseline.summary.ttlIndexCount}`
  );

  console.log(
    `Indexed query plans      : ${baseline.summary.collectionsWithIndexedPlan}/${baseline.selectedCollectionCount}`
  );

  console.log(
    `Collection scans         : ${baseline.summary.collectionsWithCollectionScan}`
  );

  for (
    const result
    of baseline.results
  ) {
    const indexes =
      result.indexInspection;

    const query =
      result.queryMeasurement;

    console.log("");
    console.log(
      `[${result.collectionName}]`
    );

    console.log(
      `Indexes              : ${indexes.indexCount}`
    );

    console.log(
      `TTL indexes          : ${indexes.ttlIndexes.length}`
    );

    console.log(
      `Index inspection     : ${formatMs(indexes.inspectionMs)}`
    );

    console.log(
      `Query wall clock     : ${formatMs(query.wallClockMs)}`
    );

    console.log(
      `Execution time       : ${formatMs(query.executionTimeMillis)}`
    );

    console.log(
      `Documents examined   : ${query.totalDocsExamined ?? "N/A"}`
    );

    console.log(
      `Keys examined        : ${query.totalKeysExamined ?? "N/A"}`
    );

    console.log(
      `Documents returned   : ${query.nReturned ?? "N/A"}`
    );

    console.log(
      `Indexed stage        : ${query.hasIndexedStage ? "YES" : "NO"}`
    );

    console.log(
      `COLLSCAN             : ${query.hasCollectionScan ? "YES" : "NO"}`
    );
  }

  // -------------------------------------------------------------------------
  // K. Final safety confirmation
  // -------------------------------------------------------------------------

  section(
    "K. Final database safety confirmation"
  );

  check(
    baseline.executionBoundary
      .performsDatabaseMutation ===
      false,
    "live 14.3 baseline performs no database mutation"
  );

  check(
    baseline.executionBoundary
      .performsIndexCreate ===
      false,
    "live 14.3 baseline creates no indexes"
  );

  check(
    baseline.executionBoundary
      .performsIndexDrop ===
      false,
    "live 14.3 baseline drops no indexes"
  );

  check(
    baseline.executionBoundary
      .performsRetentionMutation ===
      false,
    "temporary telemetry retention remains untouched"
  );

  check(
    baseline.executionBoundary
      .performsEquipmentControl ===
      false,
    "live 14.3 baseline performs no equipment control"
  );

  check(
    baseline.executionBoundary
      .performsAutoDispatch ===
      false,
    "live 14.3 baseline performs no automatic dispatch"
  );

  console.log("");
  console.log(
    "-".repeat(72)
  );

  console.log(
    "PHASE 14.3 DATABASE QUERY / INDEX PERFORMANCE RESULT"
  );

  console.log(
    "-".repeat(72)
  );

  console.log(
    `Collections inspected : ${baseline.selectedCollectionCount}`
  );

  console.log(
    `Indexes inventoried    : ${baseline.summary.totalIndexes}`
  );

  console.log(
    `Indexed plans          : ${baseline.summary.collectionsWithIndexedPlan}/${baseline.selectedCollectionCount}`
  );

  console.log(
    `Collection scans       : ${baseline.summary.collectionsWithCollectionScan}`
  );

  console.log(
    "Query limit            : 25"
  );

  console.log(
    "Query maxTimeMS        : 5000"
  );

  console.log(
    "Connection pool max    : 3"
  );

  console.log(
    "Database mutation      : NONE"
  );

  console.log(
    "Index mutation         : NONE"
  );

  console.log(
    "Retention mutation     : NONE"
  );

  console.log(
    "Equipment control      : NONE"
  );

  console.log(
    "Auto-dispatch          : DISABLED"
  );

  console.log(
    "-".repeat(72)
  );

  console.log("");
  console.log(
    `Assertions passed: ${assertionsPassed}`
  );

  console.log(
    "ASHMAAN PHASE 14.3 DATABASE QUERY / INDEX PERFORMANCE VALIDATION PASSED"
  );

  process.exitCode = 0;
} catch (error) {
  console.error("");
  console.error(
    "=".repeat(72)
  );

  console.error(
    "ASHMAAN PHASE 14.3 DATABASE QUERY / INDEX PERFORMANCE VALIDATION FAILED"
  );

  console.error(
    "=".repeat(72)
  );

  console.error(error);

  console.error("");
  console.error(
    "Do not create/drop indexes or modify telemetry retention based on assumptions."
  );

  console.error(
    "Use the first failed assertion and measured query-plan evidence only."
  );

  process.exitCode = 1;
}