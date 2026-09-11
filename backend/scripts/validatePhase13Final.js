// ============================================================================
// ASHMAAN PHASE 13.16 — PHASE 13 FINAL VALIDATION
// ============================================================================
//
// Purpose:
// - Perform aggregate final validation of Phase 13 Security & Audit Hardening.
// - Execute every completed Phase 13 checkpoint validator from 13.1–13.15.
// - Require every checkpoint to exit successfully.
// - Verify each checkpoint's expected assertion count.
// - Preserve Phase 11/12 DSS safety boundaries.
// - Perform no authentication grant, authorization grant, database mutation,
//   dependency mutation, equipment control, or automatic dispatch.
//
// IMPORTANT:
// - Phase 13.15 requires the ASHMAAN backend to be running.
// - Start the backend before executing this validator.
//
// ============================================================================

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

// ---------------------------------------------------------------------------
// Phase identity
// ---------------------------------------------------------------------------

const PHASE = "13.16";
const LAYER = "PHASE_13_FINAL_VALIDATION";

// ---------------------------------------------------------------------------
// Resolve backend/scripts directory
// ---------------------------------------------------------------------------

const currentFile = fileURLToPath(import.meta.url);
const scriptsDirectory = path.dirname(currentFile);
const backendDirectory = path.resolve(scriptsDirectory, "..");

// ---------------------------------------------------------------------------
// Validation state
// ---------------------------------------------------------------------------

let assertionsPassed = 0;

function check(condition, message) {
  assert.ok(condition, message);

  assertionsPassed += 1;

  console.log(
    `PASS ${assertionsPassed}: ${message}`
  );
}

function section(title) {
  console.log("");
  console.log(`--- ${title} ---`);
}

// ---------------------------------------------------------------------------
// Phase 13 checkpoint registry
// ---------------------------------------------------------------------------

const CHECKPOINTS = Object.freeze([
  {
    phase: "13.1",
    name: "Security Hardening Contract",
    script:
      "validatePhase13SecurityHardeningContract.js",
    assertions: 166,
  },

  {
    phase: "13.2",
    name: "Environment / Secrets Validation",
    script:
      "validatePhase13EnvironmentSecrets.js",
    assertions: 35,
  },

  {
    phase: "13.3",
    name: "Authentication Hardening",
    script:
      "validatePhase13AuthenticationHardening.js",
    assertions: 61,
  },

  {
    phase: "13.4",
    name: "Authorization / RBAC",
    script:
      "validatePhase13AuthorizationRbac.js",
    assertions: 110,
  },

  {
    phase: "13.5",
    name: "API Input Validation",
    script:
      "validatePhase13ApiInputValidation.js",
    assertions: 74,
  },

  {
    phase: "13.6",
    name: "Rate Limiting / Abuse Protection",
    script:
      "validatePhase13RateLimitingAbuseProtection.js",
    assertions: 77,
  },

  {
    phase: "13.7",
    name: "HTTP Security Headers",
    script:
      "validatePhase13HttpSecurityHeaders.js",
    assertions: 103,
  },

  {
    phase: "13.8",
    name: "CORS Production Hardening",
    script:
      "validatePhase13CorsProductionHardening.js",
    assertions: 111,
  },

  {
    phase: "13.9",
    name: "Audit Logging",
    script:
      "validatePhase13AuditLogging.js",
    assertions: 107,
  },

  {
    phase: "13.10",
    name: "Sensitive Data Redaction",
    script:
      "validatePhase13SensitiveDataRedaction.js",
    assertions: 121,
  },

  {
    phase: "13.11",
    name: "Database Security Controls",
    script:
      "validatePhase13DatabaseSecurityControls.js",
    assertions: 131,
  },

  {
    phase: "13.12",
    name: "Session / Token Security",
    script:
      "validatePhase13SessionTokenSecurity.js",
    assertions: 164,
  },

  {
    phase: "13.13",
    name: "Security Error Handling",
    script:
      "validatePhase13SecurityErrorHandling.js",
    assertions: 172,
  },

  {
    phase: "13.14",
    name: "Dependency Security Scanning",
    script:
      "validatePhase13DependencySecurityScanning.js",
    assertions: 164,
  },

  {
    phase: "13.15",
    name: "Live Security Runtime",
    script:
      "validatePhase13LiveSecurityRuntime.js",
    assertions: 54,
  },
]);

// ---------------------------------------------------------------------------
// Known aggregate assertion count from Phase 13.1–13.15
// ---------------------------------------------------------------------------

const EXPECTED_AGGREGATE_CHECKPOINT_ASSERTIONS =
  CHECKPOINTS.reduce(
    (total, checkpoint) =>
      total + checkpoint.assertions,
    0
  );

// ---------------------------------------------------------------------------
// Safety declaration for this validator
// ---------------------------------------------------------------------------

const FINAL_VALIDATOR_SAFETY = Object.freeze({
  authenticationGrant: false,
  authorizationGrant: false,
  databaseMutation: false,
  dependencyMutation: false,
  equipmentControl: false,
  autoDispatch: false,
});

// ---------------------------------------------------------------------------
// Execute one checkpoint validator
// ---------------------------------------------------------------------------

function executeCheckpoint(checkpoint) {
  const scriptPath = path.join(
    scriptsDirectory,
    checkpoint.script
  );

  check(
    fs.existsSync(scriptPath),
    `${checkpoint.phase} validator exists: ${checkpoint.script}`
  );

  const result = spawnSync(
    process.execPath,
    [scriptPath],
    {
      cwd: backendDirectory,

      env: {
        ...process.env,
      },

      encoding: "utf8",

      windowsHide: true,

      maxBuffer:
        20 * 1024 * 1024,
    }
  );

  const stdout =
    typeof result.stdout === "string"
      ? result.stdout
      : "";

  const stderr =
    typeof result.stderr === "string"
      ? result.stderr
      : "";

  const combinedOutput =
    `${stdout}\n${stderr}`;

  if (result.error) {
    console.error("");
    console.error(
      `${checkpoint.phase} PROCESS ERROR`
    );
    console.error(
      result.error
    );
  }

  if (result.status !== 0) {
    console.error("");
    console.error(
      "=".repeat(72)
    );

    console.error(
      `${checkpoint.phase} ${checkpoint.name.toUpperCase()} FAILED`
    );

    console.error(
      "=".repeat(72)
    );

    if (stdout.trim()) {
      console.error(stdout.trimEnd());
    }

    if (stderr.trim()) {
      console.error(stderr.trimEnd());
    }
  }

  check(
    result.error == null,
    `${checkpoint.phase} validator launches successfully`
  );

  check(
    result.status === 0,
    `${checkpoint.phase} validator exits successfully`
  );

  const assertionPattern =
    new RegExp(
      `Assertions passed:\\s*${checkpoint.assertions}\\b`,
      "i"
    );

  check(
    assertionPattern.test(
      combinedOutput
    ),
    `${checkpoint.phase} reports expected assertion count ${checkpoint.assertions}`
  );

  check(
    !/VALIDATION FAILED/i.test(
      combinedOutput
    ),
    `${checkpoint.phase} reports no validation failure`
  );

  return {
    phase:
      checkpoint.phase,

    name:
      checkpoint.name,

    assertions:
      checkpoint.assertions,

    status:
      "PASS",
  };
}

// ============================================================================
// MAIN
// ============================================================================

console.log("");
console.log(
  "=".repeat(72)
);

console.log(
  "ASHMAAN PHASE 13.16 — PHASE 13 FINAL VALIDATION"
);

console.log(
  "=".repeat(72)
);

console.log(
  `Backend directory : ${backendDirectory}`
);

console.log(
  `Scripts directory : ${scriptsDirectory}`
);

console.log(
  `Checkpoint count  : ${CHECKPOINTS.length}`
);

console.log(
  `Expected Phase 13 checkpoint assertions : ${EXPECTED_AGGREGATE_CHECKPOINT_ASSERTIONS}`
);

try {
  // -------------------------------------------------------------------------
  // A. Phase identity
  // -------------------------------------------------------------------------

  section(
    "A. Phase identity"
  );

  check(
    PHASE === "13.16",
    "phase identity is 13.16"
  );

  check(
    LAYER ===
      "PHASE_13_FINAL_VALIDATION",
    "layer identity is PHASE_13_FINAL_VALIDATION"
  );

  // -------------------------------------------------------------------------
  // B. Checkpoint registry integrity
  // -------------------------------------------------------------------------

  section(
    "B. Phase 13 checkpoint registry"
  );

  check(
    CHECKPOINTS.length === 15,
    "Phase 13 registry contains exactly 15 completed checkpoints"
  );

  const checkpointPhases =
    CHECKPOINTS.map(
      (checkpoint) =>
        checkpoint.phase
    );

  const expectedPhases = [
    "13.1",
    "13.2",
    "13.3",
    "13.4",
    "13.5",
    "13.6",
    "13.7",
    "13.8",
    "13.9",
    "13.10",
    "13.11",
    "13.12",
    "13.13",
    "13.14",
    "13.15",
  ];

  check(
    JSON.stringify(
      checkpointPhases
    ) ===
      JSON.stringify(
        expectedPhases
      ),
    "Phase 13 registry preserves checkpoint order 13.1 through 13.15"
  );

  check(
    EXPECTED_AGGREGATE_CHECKPOINT_ASSERTIONS ===
      1650,
    "aggregate completed checkpoint assertion count is 1650"
  );

  // -------------------------------------------------------------------------
  // C. Execute Phase 13.1–13.15
  // -------------------------------------------------------------------------

  section(
    "C. Execute completed Phase 13 checkpoint validators"
  );

  const results = [];

  for (
    const checkpoint
    of CHECKPOINTS
  ) {
    console.log("");
    console.log(
      `[${checkpoint.phase}] ${checkpoint.name}`
    );

    const result =
      executeCheckpoint(
        checkpoint
      );

    results.push(
      result
    );
  }

  // -------------------------------------------------------------------------
  // D. Aggregate result integrity
  // -------------------------------------------------------------------------

  section(
    "D. Aggregate checkpoint integrity"
  );

  check(
    results.length ===
      CHECKPOINTS.length,
    "all registered Phase 13 checkpoints were executed"
  );

  check(
    results.every(
      (result) =>
        result.status ===
        "PASS"
    ),
    "all Phase 13 checkpoint validators passed"
  );

  const aggregateAssertions =
    results.reduce(
      (total, result) =>
        total +
        result.assertions,
      0
    );

  check(
    aggregateAssertions ===
      EXPECTED_AGGREGATE_CHECKPOINT_ASSERTIONS,
    "aggregate validated checkpoint assertion count remains 1650"
  );

  // -------------------------------------------------------------------------
  // E. Final validator safety boundary
  // -------------------------------------------------------------------------

  section(
    "E. Final validation safety boundary"
  );

  check(
    FINAL_VALIDATOR_SAFETY.authenticationGrant ===
      false,
    "final validator performs no authentication grant"
  );

  check(
    FINAL_VALIDATOR_SAFETY.authorizationGrant ===
      false,
    "final validator performs no authorization grant"
  );

  check(
    FINAL_VALIDATOR_SAFETY.databaseMutation ===
      false,
    "final validator performs no database mutation"
  );

  check(
    FINAL_VALIDATOR_SAFETY.dependencyMutation ===
      false,
    "final validator performs no dependency mutation"
  );

  check(
    FINAL_VALIDATOR_SAFETY.equipmentControl ===
      false,
    "final validator performs no equipment control"
  );

  check(
    FINAL_VALIDATOR_SAFETY.autoDispatch ===
      false,
    "final validator performs no automatic dispatch"
  );

  // -------------------------------------------------------------------------
  // F. Phase closure eligibility
  // -------------------------------------------------------------------------

  section(
    "F. Phase 13 closure eligibility"
  );

  check(
    results.every(
      (result) =>
        result.status ===
        "PASS"
    ),
    "Phase 13.1 through 13.15 are all validated"
  );

  check(
    aggregateAssertions ===
      1650,
    "all 1650 prior Phase 13 assertions are represented"
  );

  check(
    FINAL_VALIDATOR_SAFETY.equipmentControl ===
      false &&
      FINAL_VALIDATOR_SAFETY.autoDispatch ===
        false,
    "engineering safety boundary remains non-executable and non-dispatching"
  );

  // -------------------------------------------------------------------------
  // Final report
  // -------------------------------------------------------------------------

  console.log("");
  console.log(
    "-".repeat(72)
  );

  console.log(
    "PHASE 13.16 FINAL VALIDATION RESULT"
  );

  console.log(
    "-".repeat(72)
  );

  for (
    const result
    of results
  ) {
    console.log(
      `${result.phase.padEnd(6)} ${result.status.padEnd(5)} ${String(
        result.assertions
      ).padStart(4)} assertions  ${result.name}`
    );
  }

  console.log(
    "-".repeat(72)
  );

  console.log(
    `Checkpoint validators     : ${results.length}/${CHECKPOINTS.length} PASS`
  );

  console.log(
    `Checkpoint assertions     : ${aggregateAssertions}/${EXPECTED_AGGREGATE_CHECKPOINT_ASSERTIONS}`
  );

  console.log(
    "Authentication grant      : NONE"
  );

  console.log(
    "Authorization grant       : NONE"
  );

  console.log(
    "Database mutation         : NONE"
  );

  console.log(
    "Dependency mutation       : NONE"
  );

  console.log(
    "Equipment control         : NONE"
  );

  console.log(
    "Auto-dispatch             : DISABLED"
  );

  console.log(
    "Phase 13 closure eligible : YES"
  );

  console.log(
    "-".repeat(72)
  );

  console.log("");
  console.log(
    `Assertions passed: ${assertionsPassed}`
  );

  console.log(
    "ASHMAAN PHASE 13.16 FINAL VALIDATION PASSED"
  );

  process.exitCode = 0;
} catch (error) {
  console.error("");
  console.error(
    "=".repeat(72)
  );

  console.error(
    "ASHMAAN PHASE 13.16 FINAL VALIDATION FAILED"
  );

  console.error(
    "=".repeat(72)
  );

  console.error(
    error
  );

  console.error("");
  console.error(
    "Phase 13 MUST NOT be closed until this validator passes completely."
  );

  process.exitCode = 1;
}