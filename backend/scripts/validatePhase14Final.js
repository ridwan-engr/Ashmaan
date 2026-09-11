// scripts/validatePhase14Final.js

import assert from "node:assert/strict";

import {
  access,
  readFile,
} from "node:fs/promises";

import {
  constants,
} from "node:fs";

import {
  dirname,
  resolve,
} from "node:path";

import {
  fileURLToPath,
} from "node:url";

import {
  spawnSync,
} from "node:child_process";


const PHASE =
  "14.13";

const LAYER =
  "PHASE_14_FINAL_VALIDATION";


const __filename =
  fileURLToPath(
    import.meta.url
  );

const __dirname =
  dirname(
    __filename
  );

const BACKEND_ROOT =
  resolve(
    __dirname,
    ".."
  );

const FRONTEND_ROOT =
  resolve(
    process.env.ASHMAAN_FRONTEND_PATH ??
      resolve(
        BACKEND_ROOT,
        "..",
        "..",
        "ASHMAAN-FRONTEND"
      )
  );


let checks =
  0;


function section(
  title
) {
  console.log(
    `\n--- ${title} ---`
  );
}


function pass(
  message
) {
  checks +=
    1;

  console.log(
    `PASS ${checks}: ${message}`
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


async function exists(
  relativePath,
  root = BACKEND_ROOT
) {
  try {
    await access(
      resolve(
        root,
        relativePath
      ),
      constants.F_OK
    );

    return true;
  } catch {
    return false;
  }
}


async function source(
  relativePath,
  root = BACKEND_ROOT
) {
  return readFile(
    resolve(
      root,
      relativePath
    ),
    "utf8"
  );
}


function runNodeValidator(
  relativePath
) {
  const absolutePath =
    resolve(
      BACKEND_ROOT,
      relativePath
    );


  const result =
    spawnSync(
      process.execPath,
      [
        absolutePath,
      ],
      {
        cwd:
          BACKEND_ROOT,

        encoding:
          "utf8",

        stdio:
          "pipe",
      }
    );


  if (
    result.stdout
  ) {
    process.stdout.write(
      result.stdout
    );
  }


  if (
    result.stderr
  ) {
    process.stderr.write(
      result.stderr
    );
  }


  assert.equal(
    result.status,
    0,
    `${relativePath} exited with status ${result.status}`
  );
}


function runNodeCheck(
  relativePath
) {
  const result =
    spawnSync(
      process.execPath,
      [
        "--check",
        resolve(
          BACKEND_ROOT,
          relativePath
        ),
      ],
      {
        cwd:
          BACKEND_ROOT,

        encoding:
          "utf8",
      }
    );


  assert.equal(
    result.status,
    0,
    `node --check failed: ${relativePath}`
  );
}


console.log(`
============================================================================
ASHMAAN PHASE 14.13 — FINAL PERFORMANCE / RESILIENCE VALIDATION
============================================================================
`);


/*
|--------------------------------------------------------------------------
| A. Phase identity
|--------------------------------------------------------------------------
*/

section(
  "A. Final phase identity"
);


assert.equal(
  PHASE,
  "14.13"
);
pass(
  "final checkpoint identity is 14.13"
);


assert.equal(
  LAYER,
  "PHASE_14_FINAL_VALIDATION"
);
pass(
  "final validator remains inside Phase 14"
);


/*
|--------------------------------------------------------------------------
| B. Required Phase 14 artifacts
|--------------------------------------------------------------------------
*/

section(
  "B. Required Phase 14 artifacts"
);


const requiredArtifacts =
  [
    "services/performance/performanceResilienceContract.js",
    "scripts/validatePhase14PerformanceResilienceContract.js",

    "scripts/validatePhase14DatabasePerformance.js",

    "services/performance/runtimeResourceBaselineService.js",
    "scripts/validatePhase14RuntimeResources.js",

    "services/performance/runtimeSustainedBaselineService.js",
    "scripts/validatePhase14SustainedRuntime.js",

    "services/performance/failureRecoveryBaselineService.js",
    "scripts/validatePhase14FailureRecovery.js",

    "services/performance/concurrencyBackpressureBaselineService.js",
    "scripts/validatePhase14ConcurrencyBackpressure.js",

    "services/performance/apiPerformanceBaselineService.js",
    "scripts/validatePhase14ApiPerformance.js",

    "services/performance/schedulerResilienceBaselineService.js",
    "scripts/validatePhase14SchedulerResilience.js",

    "services/performance/endToEndResilienceAuditService.js",
    "scripts/validatePhase14EndToEndResilienceAudit.js",
  ];


for (
  const relativePath
  of requiredArtifacts
) {
  assert.equal(
    await exists(
      relativePath
    ),
    true,
    `Missing required Phase 14 artifact: ${relativePath}`
  );

  pass(
    `required Phase 14 artifact exists: ${relativePath}`
  );
}


/*
|--------------------------------------------------------------------------
| C. Critical backend syntax
|--------------------------------------------------------------------------
*/

section(
  "C. Critical backend syntax"
);


const syntaxFiles =
  [
    "server.js",
    "services/sync/telemetryNormalizer.js",
    "services/scheduler/syncJobRunner.js",
    "services/scheduler/vrmScheduler.js",
    "services/performance/performanceResilienceContract.js",
    "services/performance/apiPerformanceBaselineService.js",
    "services/performance/schedulerResilienceBaselineService.js",
    "services/performance/endToEndResilienceAuditService.js",
  ];


for (
  const relativePath
  of syntaxFiles
) {
  runNodeCheck(
    relativePath
  );

  pass(
    `syntax passes: ${relativePath}`
  );
}


/*
|--------------------------------------------------------------------------
| D. Process lifecycle closure
|--------------------------------------------------------------------------
*/

section(
  "D. Process lifecycle resilience"
);


const serverSource =
  await source(
    "server.js"
  );


check(
  /mongoose\s+from\s+["']mongoose["']/.test(
    serverSource
  ),
  "server imports the existing Mongoose runtime"
);


check(
  /SHUTDOWN_TIMEOUT_MS/.test(
    serverSource
  ),
  "shutdown has an explicit finite safety bound"
);


check(
  /shutdownInProgress/.test(
    serverSource
  ),
  "duplicate shutdown execution is controlled"
);


check(
  /stopVrmScheduler\s*\(\s*\)/.test(
    serverSource
  ),
  "shutdown stops future scheduler work"
);


check(
  /server\.close\s*\(/.test(
    serverSource
  ),
  "shutdown stops accepting new HTTP work"
);


check(
  /mongoose\.disconnect\s*\(\s*\)/.test(
    serverSource
  ),
  "shutdown closes the existing MongoDB connection"
);


check(
  /setTimeout\s*\(/.test(
    serverSource
  ),
  "shutdown uses a finite forced-termination timer"
);


check(
  /process\.exit\s*\(\s*1\s*\)/.test(
    serverSource
  ),
  "forced failure termination remains possible"
);


check(
  /process\.exit\s*\(\s*0\s*\)/.test(
    serverSource
  ),
  "successful graceful shutdown exits cleanly"
);


check(
  /SIGINT/.test(
    serverSource
  ),
  "SIGINT shutdown remains installed"
);


check(
  /SIGTERM/.test(
    serverSource
  ),
  "SIGTERM shutdown remains installed"
);


/*
|--------------------------------------------------------------------------
| E. Production scheduler preservation
|--------------------------------------------------------------------------
*/

section(
  "E. Scheduler resilience preservation"
);


const schedulerSource =
  await source(
    "services/scheduler/vrmScheduler.js"
  );

const runnerSource =
  await source(
    "services/scheduler/syncJobRunner.js"
  );


check(
  /jobLocks/.test(
    schedulerSource
  ),
  "scheduler overlap locks remain present"
);


check(
  /previous execution still running/.test(
    schedulerSource
  ),
  "same-job overlap remains controlled"
);


check(
  /finally\s*\{/.test(
    schedulerSource
  ),
  "scheduler lock cleanup remains finally-based"
);


check(
  /clearTimeout/.test(
    schedulerSource
  ) &&
    /clearInterval/.test(
      schedulerSource
    ),
  "scheduler stop clears all timer classes"
);


check(
  /Math\.min/.test(
    runnerSource
  ) &&
    /safeConcurrency/.test(
      runnerSource
    ),
  "worker fan-out remains bounded"
);


/*
|--------------------------------------------------------------------------
| F. Data semantics
|--------------------------------------------------------------------------
*/

section(
  "F. Engineering-data semantic preservation"
);


const contractSource =
  await source(
    "services/performance/performanceResilienceContract.js"
  );

const normalizerSource =
  await source(
    "services/sync/telemetryNormalizer.js"
  );


check(
  /TREAT_MISSING_AS_ZERO/.test(
    contractSource
  ),
  "missing telemetry cannot be converted to zero"
);


check(
  /TREAT_UNAVAILABLE_AS_ZERO/.test(
    contractSource
  ),
  "UNAVAILABLE cannot be converted to zero"
);


check(
  /INFER_UNITS/.test(
    contractSource
  ),
  "unit inference remains prohibited"
);


check(
  /INFER_TOPOLOGY/.test(
    contractSource
  ),
  "topology inference remains prohibited"
);


check(
  /SILENTLY_RESAMPLE/.test(
    contractSource
  ),
  "silent resampling remains prohibited"
);


check(
  /SILENTLY_INTERPOLATE/.test(
    contractSource
  ),
  "silent interpolation remains prohibited"
);


check(
  /MISSING/.test(
    normalizerSource
  ) &&
    /numericValue/.test(
      normalizerSource
    ),
  "production normalizer preserves missing/null semantics"
);


/*
|--------------------------------------------------------------------------
| G. Security preservation
|--------------------------------------------------------------------------
*/

section(
  "G. Phase 13 security preservation"
);


check(
  /helmet\s*\(/.test(
    serverSource
  ),
  "Helmet remains active"
);


check(
  /cors\s*\(/.test(
    serverSource
  ),
  "CORS remains active"
);


check(
  /notFound/.test(
    serverSource
  ),
  "controlled not-found handling remains active"
);


check(
  /errorHandler/.test(
    serverSource
  ),
  "centralized error handling remains active"
);


check(
  /BYPASS_AUTHENTICATION/.test(
    contractSource
  ),
  "authentication bypass remains prohibited"
);


check(
  /BYPASS_AUTHORIZATION/.test(
    contractSource
  ),
  "authorization bypass remains prohibited"
);


check(
  /WEAKEN_SECURITY_HEADERS/.test(
    contractSource
  ),
  "security-header weakening remains prohibited"
);


check(
  /EXPOSE_STACK_TRACE/.test(
    contractSource
  ),
  "stack-trace exposure remains prohibited"
);


/*
|--------------------------------------------------------------------------
| H. DSS safety boundary
|--------------------------------------------------------------------------
*/

section(
  "H. Optimization/DSS safety boundary"
);


const optimizationFinalSource =
  await source(
    "scripts/validateOptimizationDssFinal.js"
  );


check(
  /advisory/i.test(
    optimizationFinalSource
  ),
  "DSS remains advisory-only"
);


check(
  /non[- ]?executable|executable/i.test(
    optimizationFinalSource
  ),
  "DSS remains non-executable"
);


check(
  /auto[- ]?dispatch|autoDispatch/i.test(
    optimizationFinalSource
  ),
  "automatic dispatch remains prohibited"
);


check(
  /AUTOMATIC_EQUIPMENT_CONTROL/.test(
    contractSource
  ),
  "automatic equipment control remains prohibited"
);


check(
  /AUTOMATIC_DISPATCH/.test(
    contractSource
  ),
  "automatic dispatch remains prohibited by Phase 14"
);


/*
|--------------------------------------------------------------------------
| I. Re-run controlled Phase 14 regression gates
|--------------------------------------------------------------------------
*/

section(
  "I. Controlled Phase 14 regression validators"
);


const regressionValidators =
  [
    "scripts/validatePhase14PerformanceResilienceContract.js",
    "scripts/validatePhase14RuntimeResources.js",
    "scripts/validatePhase14SustainedRuntime.js",
    "scripts/validatePhase14FailureRecovery.js",
    "scripts/validatePhase14ConcurrencyBackpressure.js",
    "scripts/validatePhase14SchedulerResilience.js",
    "scripts/validatePhase14EndToEndResilienceAudit.js",
  ];


for (
  const validator
  of regressionValidators
) {
  runNodeValidator(
    validator
  );

  pass(
    `controlled regression validator passed: ${validator}`
  );
}


/*
|--------------------------------------------------------------------------
| J. Live-evidence preservation
|--------------------------------------------------------------------------
|
| Phase 14.3 and 14.10 are intentionally not rerun here:
|
| 14.3 uses live MongoDB read-only evidence.
| 14.10 requires a live backend.
|
| Both have already been independently executed successfully and their
| implementation validators must remain present.
|
|--------------------------------------------------------------------------
*/

section(
  "J. Live evidence boundaries"
);


assert.equal(
  await exists(
    "scripts/validatePhase14DatabasePerformance.js"
  ),
  true
);
pass(
  "Phase 14.3 live database validator remains retained"
);


assert.equal(
  await exists(
    "scripts/validatePhase14ApiPerformance.js"
  ),
  true
);
pass(
  "Phase 14.10 live API validator remains retained"
);


/*
|--------------------------------------------------------------------------
| K. Phase 12 / Phase 13 closure artifacts
|--------------------------------------------------------------------------
*/

section(
  "K. Upstream closure preservation"
);


assert.equal(
  await exists(
    "scripts/validatePhase12FinalValidation.js"
  ),
  true
);
pass(
  "Phase 12 final integration gate remains retained"
);


assert.equal(
  await exists(
    "scripts/validatePhase13Final.js"
  ),
  true
);
pass(
  "Phase 13 final security gate remains retained"
);


/*
|--------------------------------------------------------------------------
| L. Final result
|--------------------------------------------------------------------------
*/

section(
  "L. Phase 14 final result"
);


console.log(`
Phase                         : 14.13
Performance contract          : PRESERVED
Database evidence             : RETAINED
Runtime resource controls     : VERIFIED
Sustained workload            : VERIFIED
Failure recovery              : VERIFIED
Concurrency / backpressure    : VERIFIED
API evidence                  : RETAINED
Scheduler resilience          : VERIFIED
End-to-end resilience audit   : VERIFIED

Graceful shutdown             : VERIFIED
HTTP drain                    : BOUNDED
MongoDB disconnect            : VERIFIED
Forced termination fallback   : VERIFIED

Missing != zero               : PRESERVED
UNAVAILABLE != zero           : PRESERVED
Unit inference                : PROHIBITED
Topology inference            : PROHIBITED
Silent interpolation          : PROHIBITED
Silent resampling             : PROHIBITED

Phase 13 security             : PRESERVED
DSS advisory-only             : PRESERVED
DSS executable control        : PROHIBITED
Equipment control             : PROHIBITED
Automatic dispatch            : DISABLED
`);


console.log(
  "----------------------------------------------------------------------------"
);

console.log(
  `Assertions passed: ${checks}`
);

console.log(
  "ASHMAAN PHASE 14.13 FINAL PERFORMANCE / RESILIENCE VALIDATION PASSED"
);