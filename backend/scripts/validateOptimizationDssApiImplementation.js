// scripts/validateOptimizationDssApiImplementation.js

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  fileURLToPath,
} from "node:url";

import {
  OPTIMIZATION_DSS_API_IMPLEMENTATION_PHASE,
  OPTIMIZATION_DSS_API_IMPLEMENTATION_LAYER,
  OPTIMIZATION_DSS_API_IMPLEMENTATION_UPSTREAM_PHASE,
  OPTIMIZATION_DSS_API_IMPLEMENTATION_BOUNDARIES,
  createOptimizationDssApiService,
} from "../services/optimizationDss/optimizationDssApiService.js";

import {
  createOptimizationDssController,
} from "../controllers/optimizationDssController.js";


let assertions = 0;

function pass(
  message
) {
  assertions += 1;
  console.log(
    `PASS ${assertions}: ${message}`
  );
}


console.log();
console.log("================================================");
console.log("ASHMAAN OPTIMIZATION/DSS API IMPLEMENTATION VALIDATION");
console.log("================================================");
console.log(`Phase: ${OPTIMIZATION_DSS_API_IMPLEMENTATION_PHASE}`);
console.log();


assert.equal(
  OPTIMIZATION_DSS_API_IMPLEMENTATION_PHASE,
  "11.13"
);
pass("11.13 phase identity is correct");

assert.equal(
  OPTIMIZATION_DSS_API_IMPLEMENTATION_LAYER,
  "OPTIMIZATION_DSS"
);
pass("11.13 remains inside Optimization/DSS");

assert.equal(
  OPTIMIZATION_DSS_API_IMPLEMENTATION_UPSTREAM_PHASE,
  "11.12"
);
pass("11.13 consumes validated Phase 11.12 API contract");


const persistedFixture =
  Object.freeze({
    persistenceKey:
      "a".repeat(64),

    scope:
      "SITE",

    scopeIdentity:
      {
        vrmSiteId:
          "vrm-site-001",
      },

    recommendationKind:
      "DISPATCH_SETPOINT",

    generationStatus:
      "GENERATED",

    applicability:
      "APPLICABLE",

    confidence:
      "HIGH",

    objectiveValue:
      0,

    recommendation:
      {
        advisoryOnly:
          true,

        executable:
          false,

        autoDispatch:
          false,

        actions:
          [
            {
              target:
                "grid-power",

              value:
                0,

              unit:
                "kW",
            },
          ],
      },

    horizon:
      {
        start:
          "2026-09-08T00:00:00.000Z",

        end:
          "2026-09-08T02:00:00.000Z",

        timezone:
          "Africa/Lagos",
      },
  });


let lastListArgs =
  null;

let lastGetArgs =
  null;

const repository =
  Object.freeze({
    async listRecommendations(
      args
    ) {
      lastListArgs =
        args;

      return {
        items:
          [
            persistedFixture,
          ],

        total:
          1,
      };
    },

    async findByPersistenceKey(
      args
    ) {
      lastGetArgs =
        args;

      if (
        args.persistenceKey ===
          persistedFixture.persistenceKey
      ) {
        return persistedFixture;
      }

      return null;
    },
  });


const apiService =
  createOptimizationDssApiService({
    repository,
  });


assert.equal(
  apiService.phase,
  "11.13"
);
pass("API service preserves Phase 11.13 identity");

assert.equal(
  apiService.layer,
  "OPTIMIZATION_DSS"
);
pass("API service remains inside Optimization/DSS");

assert.equal(
  apiService.upstreamPhase,
  "11.12"
);
pass("API service preserves Phase 11.12 lineage");

assert.equal(
  apiService.contractPhase,
  "11.12"
);
pass("API service preserves API-contract phase identity");

assert.equal(
  apiService.contractLayer,
  "OPTIMIZATION_DSS"
);
pass("API service preserves API-contract layer");


const listEnvelope =
  await apiService.listRecommendations({
    query:
      {
        page:
          "2",

        limit:
          "10",

        sortBy:
          "horizon.start",

        sortDirection:
          "asc",

        scope:
          "SITE",

        vrmSiteId:
          "vrm-site-001",

        recommendationKind:
          "DISPATCH_SETPOINT",

        generationStatus:
          "GENERATED",

        horizonStart:
          "2026-09-08T00:00:00Z",

        horizonEnd:
          "2026-09-08T02:00:00Z",
      },
  });


assert.equal(
  listEnvelope.status,
  "OK"
);
pass("list service returns OK envelope");

assert.equal(
  listEnvelope.data.length,
  1
);
pass("list service returns repository data");

assert.equal(
  listEnvelope.data[0],
  persistedFixture
);
pass("list service preserves persisted item by reference");

assert.equal(
  listEnvelope.data[0].objectiveValue,
  0
);
pass("list service preserves explicit zero objective value");

assert.equal(
  listEnvelope.data[0].recommendation.actions[0].value,
  0
);
pass("list service preserves explicit zero advisory setpoint");

assert.equal(
  listEnvelope.meta.page,
  2
);
pass("list service preserves parsed page");

assert.equal(
  listEnvelope.meta.limit,
  10
);
pass("list service preserves parsed limit");

assert.equal(
  listEnvelope.meta.total,
  1
);
pass("list service preserves repository total");

assert.equal(
  listEnvelope.meta.pageCount,
  1
);
pass("list service calculates page count");

assert.equal(
  lastListArgs.offset,
  10
);
pass("read repository receives deterministic offset");

assert.equal(
  lastListArgs.limit,
  10
);
pass("read repository receives validated limit");

assert.equal(
  lastListArgs.sort.field,
  "horizon.start"
);
pass("read repository receives validated sort field");

assert.equal(
  lastListArgs.sort.direction,
  "asc"
);
pass("read repository receives validated sort direction");

assert.equal(
  lastListArgs.filters.vrmSiteId,
  "vrm-site-001"
);
pass("read repository receives site filter");

assert.equal(
  lastListArgs.filters.horizonStart,
  "2026-09-08T00:00:00.000Z"
);
pass("read repository receives normalized horizon start");


const getEnvelope =
  await apiService.getRecommendation({
    persistenceKey:
      persistedFixture.persistenceKey,
  });


assert.equal(
  getEnvelope.status,
  "OK"
);
pass("get-by-key service returns OK for existing record");

assert.equal(
  getEnvelope.data,
  persistedFixture
);
pass("get-by-key service preserves repository record by reference");

assert.equal(
  lastGetArgs.persistenceKey,
  persistedFixture.persistenceKey
);
pass("read repository receives exact persistence key");


const notFoundEnvelope =
  await apiService.getRecommendation({
    persistenceKey:
      "b".repeat(64),
  });


assert.equal(
  notFoundEnvelope.status,
  "NOT_FOUND"
);
pass("missing record returns NOT_FOUND");

assert.equal(
  notFoundEnvelope.data,
  null
);
pass("NOT_FOUND fabricates no record");

assert.equal(
  notFoundEnvelope.error.code,
  "RECOMMENDATION_NOT_FOUND"
);
pass("NOT_FOUND error code is explicit");


const invalidListEnvelope =
  await apiService.listRecommendations({
    query:
      {
        limit:
          "101",
      },
  });


assert.equal(
  invalidListEnvelope.status,
  "INVALID_REQUEST"
);
pass("invalid list query returns INVALID_REQUEST");

assert.equal(
  invalidListEnvelope.data,
  null
);
pass("invalid list query fabricates no data");


const invalidGetEnvelope =
  await apiService.getRecommendation({
    persistenceKey:
      "bad-key",
  });


assert.equal(
  invalidGetEnvelope.status,
  "INVALID_REQUEST"
);
pass("invalid persistence key returns INVALID_REQUEST");

assert.equal(
  invalidGetEnvelope.data,
  null
);
pass("invalid persistence key fabricates no data");


const failingRepository =
  Object.freeze({
    async listRecommendations() {
      throw new Error(
        "repository unavailable"
      );
    },

    async findByPersistenceKey() {
      throw new Error(
        "repository unavailable"
      );
    },
  });


const failingService =
  createOptimizationDssApiService({
    repository:
      failingRepository,
  });


const unavailableList =
  await failingService.listRecommendations();


assert.equal(
  unavailableList.status,
  "UNAVAILABLE"
);
pass("list repository failure returns UNAVAILABLE");

assert.equal(
  unavailableList.data,
  null
);
pass("list repository failure fabricates no data");

assert.equal(
  unavailableList.error.code,
  "READ_REPOSITORY_UNAVAILABLE"
);
pass("list repository failure code is explicit");


const unavailableGet =
  await failingService.getRecommendation({
    persistenceKey:
      persistedFixture.persistenceKey,
  });


assert.equal(
  unavailableGet.status,
  "UNAVAILABLE"
);
pass("get repository failure returns UNAVAILABLE");

assert.equal(
  unavailableGet.data,
  null
);
pass("get repository failure fabricates no data");


const emptyRepository =
  Object.freeze({
    async listRecommendations() {
      return {
        items:
          [],
        total:
          0,
      };
    },

    async findByPersistenceKey() {
      return null;
    },
  });


const emptyService =
  createOptimizationDssApiService({
    repository:
      emptyRepository,
  });


const emptyList =
  await emptyService.listRecommendations();


assert.equal(
  emptyList.status,
  "OK"
);
pass("empty persisted result remains valid OK response");

assert.deepEqual(
  emptyList.data,
  []
);
pass("empty persisted result remains empty array");

assert.equal(
  emptyList.meta.total,
  0
);
pass("explicit zero total remains zero");

assert.equal(
  emptyList.meta.pageCount,
  0
);
pass("explicit zero total produces zero page count");


let listCalled =
  0;

let getCalled =
  0;

const controllerService =
  Object.freeze({
    async listRecommendations() {
      listCalled +=
        1;

      return {
        status:
          "OK",
        data:
          [],
      };
    },

    async getRecommendation() {
      getCalled +=
        1;

      return {
        status:
          "NOT_FOUND",
        data:
          null,
        error:
          {
            code:
              "RECOMMENDATION_NOT_FOUND",
          },
      };
    },
  });


const apiController =
  createOptimizationDssController({
    apiService:
      controllerService,
  });


function createResponseDouble() {
  return {
    statusCode:
      null,

    payload:
      null,

    status(
      code
    ) {
      this.statusCode =
        code;

      return this;
    },

    json(
      payload
    ) {
      this.payload =
        payload;

      return this;
    },
  };
}


const listResponse =
  createResponseDouble();

await apiController.listRecommendations(
  {
    query:
      {},
  },
  listResponse
);


assert.equal(
  listCalled,
  1
);
pass("controller invokes list API service exactly once");

assert.equal(
  listResponse.statusCode,
  200
);
pass("controller maps OK to HTTP 200");

assert.equal(
  listResponse.payload.status,
  "OK"
);
pass("controller returns list envelope unchanged");


const getResponse =
  createResponseDouble();

await apiController.getRecommendation(
  {
    params:
      {
        persistenceKey:
          "a".repeat(64),
      },
  },
  getResponse
);


assert.equal(
  getCalled,
  1
);
pass("controller invokes get API service exactly once");

assert.equal(
  getResponse.statusCode,
  404
);
pass("controller maps NOT_FOUND to HTTP 404");

assert.equal(
  getResponse.payload.error.code,
  "RECOMMENDATION_NOT_FOUND"
);
pass("controller preserves NOT_FOUND payload");


for (
  const [
    status,
    expectedCode,
  ] of
  [
    [
      "INVALID_REQUEST",
      400,
    ],
    [
      "UNAVAILABLE",
      503,
    ],
  ]
) {
  const service =
    Object.freeze({
      async listRecommendations() {
        return {
          status,
          data:
            null,
          error:
            {
              code:
                status,
            },
        };
      },

      async getRecommendation() {
        return {
          status,
          data:
            null,
          error:
            {
              code:
                status,
            },
        };
      },
    });

  const controller =
    createOptimizationDssController({
      apiService:
        service,
    });

  const response =
    createResponseDouble();

  await controller.listRecommendations(
    {
      query:
        {},
    },
    response
  );

  assert.equal(
    response.statusCode,
    expectedCode
  );

  pass(
    `controller maps ${status} to HTTP ${expectedCode}`
  );
}


const currentDir =
  path.dirname(
    fileURLToPath(
      import.meta.url
    )
  );

const routeSource =
  fs.readFileSync(
    path.resolve(
      currentDir,
      "../routes/optimizationDssRoutes.js"
    ),
    "utf8"
  );

const repositorySource =
  fs.readFileSync(
    path.resolve(
      currentDir,
      "../services/optimizationDss/mongooseOptimizationDssReadRepository.js"
    ),
    "utf8"
  );


assert.match(
  routeSource,
  /router\.get\(\s*"\/recommendations"/
);
pass("Express route implements GET /recommendations");

assert.match(
  routeSource,
  /router\.get\(\s*"\/recommendations\/:persistenceKey"/
);
pass("Express route implements GET /recommendations/:persistenceKey");

assert.doesNotMatch(
  routeSource,
  /router\.(post|put|patch|delete)\(/
);
pass("Express route exposes no mutation endpoint");

assert.match(
  repositorySource,
  /\.find\(/
);
pass("Mongoose read repository implements list query");

assert.match(
  repositorySource,
  /\.findOne\(/
);
pass("Mongoose read repository implements get-by-key query");

assert.match(
  repositorySource,
  /\.countDocuments\(/
);
pass("Mongoose read repository implements total-count query");

assert.match(
  repositorySource,
  /\.lean\(\)/
);
pass("Mongoose read repository uses lean read results");

assert.doesNotMatch(
  repositorySource,
  /findOneAndUpdate|updateOne|deleteOne|create\(|insertMany/
);
pass("Mongoose read repository performs no persistence mutation");


const boundaryChecks =
  [
    ["implementationOnly", true, "11.13 remains API-implementation-only"],
    ["readOnly", true, "11.13 remains read-only"],
    ["listImplemented", true, "list API implementation is included"],
    ["getByPersistenceKeyImplemented", true, "get-by-key API implementation is included"],
    ["createImplemented", false, "create implementation remains excluded"],
    ["updateImplemented", false, "update implementation remains excluded"],
    ["deleteImplemented", false, "delete implementation remains excluded"],
    ["persistenceMutationIncluded", false, "11.13 performs no persistence mutation"],
    ["serverMountIncluded", false, "server.js route mount remains excluded"],
    ["liveHttpValidated", false, "live HTTP success is not claimed"],
    ["dashboardIncluded", false, "Optimization/DSS dashboard remains excluded"],
    ["automatedControlIncluded", false, "automated control remains excluded"],
    ["automaticDispatchAllowed", false, "11.13 cannot auto-dispatch"],
    ["executableActionProduced", false, "11.13 produces no executable control action"],
    ["financialBiMutationIncluded", false, "11.13 cannot mutate Financial/BI"],
    ["forecastingMutationIncluded", false, "11.13 cannot mutate Forecasting"],
    ["engineeringAnalyticsMutationIncluded", false, "11.13 cannot mutate Engineering Analytics"],
    ["telemetryMutationIncluded", false, "11.13 cannot mutate telemetry"],
    ["eventMutationIncluded", false, "11.13 cannot mutate events"],
    ["missingMeansZero", false, "missing API data never means zero"],
    ["unavailableMeansZero", false, "UNAVAILABLE API data never means zero"],
    ["unitInferenceAllowed", false, "11.13 performs no unit inference"],
    ["currencyInferenceAllowed", false, "11.13 performs no currency inference"],
    ["currencyConversionAllowed", false, "11.13 performs no currency conversion"],
    ["tariffInferenceAllowed", false, "11.13 performs no tariff inference"],
    ["emissionFactorInferenceAllowed", false, "11.13 performs no emission-factor inference"],
    ["topologyInferenceAllowed", false, "11.13 performs no topology inference"],
    ["controllabilityInferenceAllowed", false, "11.13 performs no controllability inference"],
    ["implicitTimeGridAllowed", false, "11.13 performs no implicit time-grid generation"],
    ["implicitResamplingAllowed", false, "11.13 performs no implicit resampling"],
    ["interpolationAllowed", false, "11.13 performs no interpolation"],
    ["futureObservedDataFabricationAllowed", false, "11.13 prohibits future observed-data fabrication"],
  ];


for (
  const [
    key,
    expected,
    message,
  ] of
  boundaryChecks
) {
  assert.equal(
    OPTIMIZATION_DSS_API_IMPLEMENTATION_BOUNDARIES[
      key
    ],
    expected
  );

  pass(
    message
  );
}


assert.equal(
  persistedFixture.objectiveValue,
  0
);
pass("11.13 does not mutate persisted objective value");

assert.equal(
  persistedFixture.recommendation.actions[0].value,
  0
);
pass("11.13 does not mutate persisted advisory setpoint");

assert.equal(
  persistedFixture.recommendation.executable,
  false
);
pass("11.13 preserves non-executable recommendation semantics");

assert.equal(
  persistedFixture.recommendation.autoDispatch,
  false
);
pass("11.13 preserves no-auto-dispatch semantics");

assert.doesNotThrow(
  () =>
    JSON.stringify(
      listEnvelope
    )
);
pass("11.13 list response is JSON serializable");

assert.doesNotThrow(
  () =>
    JSON.stringify(
      getEnvelope
    )
);
pass("11.13 get response is JSON serializable");

assert.doesNotThrow(
  () =>
    JSON.stringify(
      unavailableList
    )
);
pass("11.13 unavailable response is JSON serializable");


if (
  assertions !==
    97
) {
  throw new Error(
    `Expected 97 pre-final assertions, received ${assertions}.`
  );
}


pass(
  "11.13 validation assertion plan completed exactly"
);


console.log();
console.log(
  `Assertions passed: ${assertions}`
);
console.log();

console.log("================================================");
console.log("OPTIMIZATION/DSS API IMPLEMENTATION VALIDATION PASSED");
console.log("================================================");
console.log();

console.log("Validated Phase 11.13 semantics:");
console.log("- Phase 11.13 implements the validated Phase 11.12 read-only API contract");
console.log("- list and get-by-persistence-key operations execute through an explicit read repository");
console.log("- pagination, sorting, filtering and persistence-key validation are preserved");
console.log("- controller maps OK/NOT_FOUND/INVALID_REQUEST/UNAVAILABLE to 200/404/400/503");
console.log("- Express routes expose only GET /recommendations and GET /recommendations/:persistenceKey");
console.log("- Mongoose read repository uses find/findOne/countDocuments/lean and performs no writes");
console.log("- explicit zero objective values and advisory setpoints remain legitimate API data");
console.log("- no create/update/delete endpoint, persistence mutation, server.js mount or live HTTP validation occurs");
console.log("- no dashboard, automated control or auto-dispatch occurs");
console.log("- Phase 11.14 Optimization/DSS Dashboard Contract remains the next checkpoint");
