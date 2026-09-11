// ============================================================================
// ASHMAAN PHASE 14.3 — DATABASE QUERY / INDEX PERFORMANCE BASELINE
// ============================================================================
//
// Read-only performance inspection.
//
// This service:
// - opens its own bounded MongoDB connection
// - lists collection/index metadata
// - selects a bounded set of engineering-relevant collections
// - executes bounded read-only explain queries
// - performs no insert/update/delete
// - performs no createIndex/dropIndex
// - performs no retention mutation
//
// ============================================================================

import mongoose from "mongoose";
import { performance } from "node:perf_hooks";

export const PHASE_14_DATABASE_PERFORMANCE_BASELINE = Object.freeze({
  phase: "14.3",

  layer: "DATABASE_QUERY_INDEX_PERFORMANCE",

  category: "DATABASE_PERFORMANCE_BASELINE",

  mode: "READ_ONLY_MEASUREMENT",

  defaults: Object.freeze({
    maxSelectedCollections: 8,
    queryLimit: 25,
    maxTimeMs: 5_000,
    serverSelectionTimeoutMS: 10_000,
    connectTimeoutMS: 10_000,
    socketTimeoutMS: 15_000,
    maxPoolSize: 3,
    minPoolSize: 0,
  }),

  executionBoundary: Object.freeze({
    performsDocumentInsert: false,
    performsDocumentUpdate: false,
    performsDocumentDelete: false,
    performsIndexCreate: false,
    performsIndexDrop: false,
    performsCollectionDrop: false,
    performsRetentionMutation: false,
    performsDatabaseMutation: false,
    performsUnboundedScan: false,
    performsEquipmentControl: false,
    performsAutoDispatch: false,
  }),
});

const RELEVANT_COLLECTION_PATTERN =
  /(telemetry|event|forecast|financial|optimization|decision|analytics|kpi|alarm|outage|energy|solar|grid|battery|generator)/i;

function round(value, digits = 3) {
  if (!Number.isFinite(value)) {
    return null;
  }

  const factor = 10 ** digits;

  return Math.round(value * factor) / factor;
}

function normalizeIndex(index) {
  return {
    name: index.name ?? null,
    key:
      index.key &&
      typeof index.key === "object"
        ? { ...index.key }
        : {},
    unique: index.unique === true,
    sparse: index.sparse === true,
    partialFilterExpression:
      index.partialFilterExpression ?? null,
    expireAfterSeconds:
      Number.isFinite(index.expireAfterSeconds)
        ? index.expireAfterSeconds
        : null,
  };
}

function containsStage(node, stageNames) {
  if (!node || typeof node !== "object") {
    return false;
  }

  if (
    typeof node.stage === "string" &&
    stageNames.has(node.stage)
  ) {
    return true;
  }

  for (const value of Object.values(node)) {
    if (
      value &&
      typeof value === "object" &&
      containsStage(value, stageNames)
    ) {
      return true;
    }
  }

  return false;
}

function findWinningPlan(explain) {
  return (
    explain?.queryPlanner?.winningPlan ??
    explain?.queryPlanner?.winningPlan?.queryPlan ??
    null
  );
}

function analyzeExplain(explain) {
  const winningPlan = findWinningPlan(explain);

  const indexedStages = new Set([
    "IXSCAN",
    "EXPRESS_IXSCAN",
    "DISTINCT_SCAN",
    "COUNT_SCAN",
    "CLUSTERED_IXSCAN",
  ]);

  const collectionScanStages =
    new Set([
      "COLLSCAN",
    ]);

  return {
    hasIndexedStage:
      containsStage(
        winningPlan,
        indexedStages
      ),

    hasCollectionScan:
      containsStage(
        winningPlan,
        collectionScanStages
      ),

    executionTimeMillis:
      Number.isFinite(
        explain?.executionStats
          ?.executionTimeMillis
      )
        ? explain.executionStats
            .executionTimeMillis
        : null,

    totalDocsExamined:
      Number.isFinite(
        explain?.executionStats
          ?.totalDocsExamined
      )
        ? explain.executionStats
            .totalDocsExamined
        : null,

    totalKeysExamined:
      Number.isFinite(
        explain?.executionStats
          ?.totalKeysExamined
      )
        ? explain.executionStats
            .totalKeysExamined
        : null,

    nReturned:
      Number.isFinite(
        explain?.executionStats
          ?.nReturned
      )
        ? explain.executionStats
            .nReturned
        : null,
  };
}

export function selectRelevantCollections(
  collectionNames,
  maxSelectedCollections =
    PHASE_14_DATABASE_PERFORMANCE_BASELINE
      .defaults.maxSelectedCollections
) {
  if (!Array.isArray(collectionNames)) {
    throw new TypeError(
      "collectionNames must be an array"
    );
  }

  if (
    !Number.isInteger(
      maxSelectedCollections
    ) ||
    maxSelectedCollections < 1 ||
    maxSelectedCollections > 20
  ) {
    throw new RangeError(
      "maxSelectedCollections must be an integer between 1 and 20"
    );
  }

  const normalized =
    collectionNames
      .filter(
        (name) =>
          typeof name === "string" &&
          name.trim() !== ""
      )
      .map((name) => name.trim());

  const relevant =
    normalized.filter((name) =>
      RELEVANT_COLLECTION_PATTERN.test(
        name
      )
    );

  const selected =
    relevant.length > 0
      ? relevant
      : normalized;

  return selected
    .sort((a, b) =>
      a.localeCompare(b)
    )
    .slice(
      0,
      maxSelectedCollections
    );
}

export async function inspectCollectionIndexes(
  db,
  collectionName
) {
  if (!db) {
    throw new TypeError(
      "db is required"
    );
  }

  if (
    typeof collectionName !==
      "string" ||
    collectionName.trim() === ""
  ) {
    throw new TypeError(
      "collectionName must be a non-empty string"
    );
  }

  const startedAt =
    performance.now();

  const indexes =
    await db
      .collection(collectionName)
      .indexes();

  const completedAt =
    performance.now();

  const normalizedIndexes =
    indexes.map(normalizeIndex);

  return {
    collectionName,

    inspectionMs:
      round(
        completedAt -
          startedAt
      ),

    indexCount:
      normalizedIndexes.length,

    hasIdIndex:
      normalizedIndexes.some(
        (index) =>
          index.name === "_id_" ||
          index.key?._id === 1 ||
          index.key?._id === -1
      ),

    ttlIndexes:
      normalizedIndexes.filter(
        (index) =>
          Number.isFinite(
            index.expireAfterSeconds
          )
      ),

    indexes:
      normalizedIndexes,
  };
}

export async function measureBoundedCollectionQuery(
  db,
  collectionName,
  {
    queryLimit =
      PHASE_14_DATABASE_PERFORMANCE_BASELINE
        .defaults.queryLimit,

    maxTimeMs =
      PHASE_14_DATABASE_PERFORMANCE_BASELINE
        .defaults.maxTimeMs,
  } = {}
) {
  if (!db) {
    throw new TypeError(
      "db is required"
    );
  }

  if (
    typeof collectionName !==
      "string" ||
    collectionName.trim() === ""
  ) {
    throw new TypeError(
      "collectionName must be a non-empty string"
    );
  }

  if (
    !Number.isInteger(
      queryLimit
    ) ||
    queryLimit < 1 ||
    queryLimit > 100
  ) {
    throw new RangeError(
      "queryLimit must be between 1 and 100"
    );
  }

  if (
    !Number.isInteger(
      maxTimeMs
    ) ||
    maxTimeMs < 1 ||
    maxTimeMs > 30_000
  ) {
    throw new RangeError(
      "maxTimeMs must be between 1 and 30000"
    );
  }

  const collection =
    db.collection(
      collectionName
    );

  const startedAt =
    performance.now();

  const explain =
    await collection
      .find(
        {},
        {
          projection: {
            _id: 1,
          },
        }
      )
      .sort({
        _id: -1,
      })
      .limit(
        queryLimit
      )
      .maxTimeMS(
        maxTimeMs
      )
      .explain(
        "executionStats"
      );

  const completedAt =
    performance.now();

  const analysis =
    analyzeExplain(
      explain
    );

  return {
    collectionName,

    queryShape:
      "find({}).project({_id:1}).sort({_id:-1}).limit(N)",

    queryLimit,

    maxTimeMs,

    wallClockMs:
      round(
        completedAt -
          startedAt
      ),

    ...analysis,
  };
}

export async function runDatabasePerformanceBaseline({
  mongoUri =
    process.env.MONGODB_URI,

  maxSelectedCollections =
    PHASE_14_DATABASE_PERFORMANCE_BASELINE
      .defaults.maxSelectedCollections,

  queryLimit =
    PHASE_14_DATABASE_PERFORMANCE_BASELINE
      .defaults.queryLimit,

  maxTimeMs =
    PHASE_14_DATABASE_PERFORMANCE_BASELINE
      .defaults.maxTimeMs,
} = {}) {
  if (
    typeof mongoUri !== "string" ||
    mongoUri.trim() === ""
  ) {
    throw new Error(
      "MONGODB_URI is required for Phase 14.3"
    );
  }

  const defaults =
    PHASE_14_DATABASE_PERFORMANCE_BASELINE
      .defaults;

  const connection =
    mongoose.createConnection(
      mongoUri,
      {
        maxPoolSize:
          defaults.maxPoolSize,

        minPoolSize:
          defaults.minPoolSize,

        serverSelectionTimeoutMS:
          defaults.serverSelectionTimeoutMS,

        connectTimeoutMS:
          defaults.connectTimeoutMS,

        socketTimeoutMS:
          defaults.socketTimeoutMS,

        autoIndex:
          false,
      }
    );

  let connected = false;

  try {
    const dbConnection =
      await connection.asPromise();

    connected = true;

    const db =
      dbConnection.db;

    const collections =
      await db
        .listCollections(
          {},
          {
            nameOnly: true,
          }
        )
        .toArray();

    const collectionNames =
      collections
        .map(
          (item) =>
            item.name
        )
        .filter(
          (name) =>
            typeof name ===
            "string"
        );

    const selectedCollections =
      selectRelevantCollections(
        collectionNames,
        maxSelectedCollections
      );

    const results = [];

    for (
      const collectionName
      of selectedCollections
    ) {
      const indexInspection =
        await inspectCollectionIndexes(
          db,
          collectionName
        );

      const queryMeasurement =
        await measureBoundedCollectionQuery(
          db,
          collectionName,
          {
            queryLimit,
            maxTimeMs,
          }
        );

      results.push({
        collectionName,
        indexInspection,
        queryMeasurement,
      });
    }

    return {
      phase:
        PHASE_14_DATABASE_PERFORMANCE_BASELINE.phase,

      layer:
        PHASE_14_DATABASE_PERFORMANCE_BASELINE.layer,

      mode:
        PHASE_14_DATABASE_PERFORMANCE_BASELINE.mode,

      connected,

      totalCollectionCount:
        collectionNames.length,

      selectedCollectionCount:
        selectedCollections.length,

      selectedCollections,

      queryLimit,

      maxTimeMs,

      maxPoolSize:
        defaults.maxPoolSize,

      results,

      summary: {
        collectionsWithIdIndex:
          results.filter(
            (result) =>
              result.indexInspection
                .hasIdIndex
          ).length,

        collectionsWithIndexedPlan:
          results.filter(
            (result) =>
              result.queryMeasurement
                .hasIndexedStage
          ).length,

        collectionsWithCollectionScan:
          results.filter(
            (result) =>
              result.queryMeasurement
                .hasCollectionScan
          ).length,

        totalIndexes:
          results.reduce(
            (total, result) =>
              total +
              result.indexInspection
                .indexCount,
            0
          ),

        ttlIndexCount:
          results.reduce(
            (total, result) =>
              total +
              result.indexInspection
                .ttlIndexes.length,
            0
          ),
      },

      executionBoundary:
        PHASE_14_DATABASE_PERFORMANCE_BASELINE
          .executionBoundary,
    };
  } finally {
    if (
      connection.readyState !==
      0
    ) {
      await connection.close();
    }
  }
}

export default
PHASE_14_DATABASE_PERFORMANCE_BASELINE;