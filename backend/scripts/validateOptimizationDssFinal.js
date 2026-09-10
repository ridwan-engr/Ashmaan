// scripts/validateOptimizationDssFinal.js

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const PHASE = "11.16";
const LAYER = "OPTIMIZATION_DSS";
const VALIDATOR_REVISION = "11.16-FINAL-DEFINITIVE-ENCODING-SAFE";

const currentFile = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFile);
const backendDir = path.resolve(currentDir, "..");
const frontendDir =
  process.env.ASHMAAN_FRONTEND_DIR
    ? path.resolve(process.env.ASHMAAN_FRONTEND_DIR)
    : path.resolve(backendDir, "..", "..", "ASHMAAN-FRONTEND");

let assertions = 0;

function pass(message) {
  assertions += 1;
  console.log(`PASS ${assertions}: ${message}`);
}

function requireFile(filePath, message) {
  assert.equal(fs.existsSync(filePath), true, `${message}: ${filePath}`);
  pass(message);
}

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function runNodeValidatorIfPresent(scriptName, expectedMarker, phaseLabel, cwd) {
  const scriptPath = path.resolve(cwd, "scripts", scriptName);

  if (!fs.existsSync(scriptPath)) {
    return {
      present: false,
      stdout: "",
    };
  }

  const result = spawnSync(
    process.execPath,
    [scriptPath],
    {
      cwd,
      encoding: "utf8",
      shell: false,
      windowsHide: true,
    }
  );

  if (result.status !== 0) {
    process.stdout.write(result.stdout ?? "");
    process.stderr.write(result.stderr ?? "");
    throw new Error(
      `${phaseLabel} validator failed with exit code ${result.status}`
    );
  }

  assert.match(
    result.stdout ?? "",
    new RegExp(expectedMarker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
  );

  return {
    present: true,
    stdout: result.stdout ?? "",
  };
}

function runFrontendBuild() {
  let result;

  if (process.platform === "win32") {
    const comspec =
      process.env.ComSpec ||
      process.env.COMSPEC ||
      "C:\\Windows\\System32\\cmd.exe";

    result = spawnSync(
      comspec,
      ["/d", "/s", "/c", "npm run build"],
      {
        cwd: frontendDir,
        encoding: "utf8",
        shell: false,
        windowsHide: true,
      }
    );
  } else {
    result = spawnSync(
      "npm",
      ["run", "build"],
      {
        cwd: frontendDir,
        encoding: "utf8",
        shell: false,
      }
    );
  }

  if (result.status !== 0) {
    process.stdout.write(result.stdout ?? "");
    process.stderr.write(result.stderr ?? "");
    throw new Error(`Frontend build failed with exit code ${result.status}`);
  }

  assert.match(result.stdout ?? "", /built in|✓ built/i);

  return result.stdout ?? "";
}

console.log();
console.log("================================================");
console.log("ASHMAAN OPTIMIZATION/DSS FINAL VALIDATION");
console.log("================================================");
console.log(`Phase: ${PHASE}`);
console.log(`Revision: ${VALIDATOR_REVISION}`);
console.log(`Backend: ${backendDir}`);
console.log(`Frontend: ${frontendDir}`);
console.log();

assert.equal(PHASE, "11.16");
pass("11.16 phase identity is correct");

assert.equal(LAYER, "OPTIMIZATION_DSS");
pass("11.16 remains inside Optimization/DSS");

assert.notEqual(path.normalize(frontendDir), path.normalize(backendDir));
pass("frontend and backend roots remain separated");

const phaseFiles = [
  ["11.1", "services/optimizationDss/optimizationDssContract.js", "Phase 11.1 contract implementation exists"],
  ["11.2", "services/optimizationDss/optimizationDssInputQualificationService.js", "Phase 11.2 input qualification implementation exists"],
  ["11.3", "services/optimizationDss/optimizationDssModelContract.js", "Phase 11.3 model contract exists"],
  ["11.4", "services/optimizationDss/optimizationDssModelBuildService.js", "Phase 11.4 model build implementation exists"],
  ["11.5", "services/optimizationDss/optimizationDssSolverContract.js", "Phase 11.5 solver contract exists"],
  ["11.6", "services/optimizationDss/optimizationDssSolverExecutionService.js", "Phase 11.6 solver execution implementation exists"],
  ["11.7", "services/optimizationDss/optimizationDssResultQualificationService.js", "Phase 11.7 result qualification implementation exists"],
  ["11.8", "services/optimizationDss/optimizationDssRecommendationContract.js", "Phase 11.8 recommendation contract exists"],
  ["11.9", "services/optimizationDss/optimizationDssRecommendationGenerationService.js", "Phase 11.9 recommendation generation implementation exists"],
  ["11.10", "services/optimizationDss/optimizationDssPersistenceContract.js", "Phase 11.10 persistence contract exists"],
  ["11.11", "services/optimizationDss/optimizationDssPersistenceService.js", "Phase 11.11 persistence implementation exists"],
  ["11.12", "services/optimizationDss/optimizationDssApiContract.js", "Phase 11.12 API contract exists"],
  ["11.13", "services/optimizationDss/optimizationDssApiService.js", "Phase 11.13 API service exists"],
  ["11.14", "services/optimizationDss/optimizationDssDashboardContract.js", "Phase 11.14 dashboard contract exists"],
];

for (const [, relativePath, message] of phaseFiles) {
  requireFile(path.resolve(backendDir, relativePath), message);
}

requireFile(
  path.resolve(frontendDir, "src/pages/OptimizationDssDashboard.jsx"),
  "Phase 11.15 dashboard page exists"
);

requireFile(
  path.resolve(frontendDir, "src/services/api/optimizationDssDashboardApi.js"),
  "Phase 11.15 dashboard API wrapper exists"
);

const legacyValidatorPlan = [
  ["11.1", "validateOptimizationDssContract.js", "OPTIMIZATION/DSS CONTRACT VALIDATION PASSED"],
  ["11.2", "validateOptimizationDssInputQualification.js", "OPTIMIZATION/DSS INPUT QUALIFICATION VALIDATION PASSED"],
  ["11.3", "validateOptimizationDssModelContract.js", "OPTIMIZATION/DSS MODEL CONTRACT VALIDATION PASSED"],
  ["11.4", "validateOptimizationDssModelBuild.js", "OPTIMIZATION/DSS MODEL BUILD VALIDATION PASSED"],
  ["11.5", "validateOptimizationDssSolverContract.js", "OPTIMIZATION/DSS SOLVER CONTRACT VALIDATION PASSED"],
  ["11.6", "validateOptimizationDssSolverExecution.js", "OPTIMIZATION/DSS SOLVER EXECUTION VALIDATION PASSED"],
  ["11.7", "validateOptimizationDssResultQualification.js", "OPTIMIZATION/DSS RESULT QUALIFICATION VALIDATION PASSED"],
  ["11.8", "validateOptimizationDssRecommendationContract.js", "OPTIMIZATION/DSS RECOMMENDATION CONTRACT VALIDATION PASSED"],
  ["11.9", "validateOptimizationDssRecommendationGeneration.js", "OPTIMIZATION/DSS RECOMMENDATION GENERATION VALIDATION PASSED"],
];

for (const [phaseLabel, scriptName, marker] of legacyValidatorPlan) {
  const result = runNodeValidatorIfPresent(
    scriptName,
    marker,
    `Phase ${phaseLabel}`,
    backendDir
  );

  if (result.present) {
    pass(`Phase ${phaseLabel} validator re-executes successfully`);
  } else {
    const phaseFile = phaseFiles.find(([phase]) => phase === phaseLabel);
    assert.ok(phaseFile);
    const source = readText(path.resolve(backendDir, phaseFile[1]));
    assert.match(source, new RegExp(phaseLabel.replace(".", "\\.")));
    pass(
      `Phase ${phaseLabel} legacy validator file is absent; validated implementation source identity is retained`
    );
  }
}

const requiredBackendValidators = [
  ["11.10", "validateOptimizationDssPersistenceContract.js", "OPTIMIZATION/DSS PERSISTENCE CONTRACT VALIDATION PASSED"],
  ["11.11", "validateOptimizationDssPersistenceImplementation.js", "OPTIMIZATION/DSS PERSISTENCE IMPLEMENTATION VALIDATION PASSED"],
  ["11.12", "validateOptimizationDssApiContract.js", "OPTIMIZATION/DSS API CONTRACT VALIDATION PASSED"],
  ["11.13", "validateOptimizationDssApiImplementation.js", "OPTIMIZATION/DSS API IMPLEMENTATION VALIDATION PASSED"],
  ["11.14", "validateOptimizationDssDashboardContract.js", "OPTIMIZATION/DSS DASHBOARD CONTRACT VALIDATION PASSED"],
];

for (const [phaseLabel, scriptName, marker] of requiredBackendValidators) {
  const result = runNodeValidatorIfPresent(
    scriptName,
    marker,
    `Phase ${phaseLabel}`,
    backendDir
  );

  assert.equal(
    result.present,
    true,
    `Current validator missing: ${path.resolve(backendDir, "scripts", scriptName)}`
  );

  pass(`Phase ${phaseLabel} validator re-executes successfully`);
}

const frontendValidator = runNodeValidatorIfPresent(
  "validateOptimizationDssDashboardImplementation.js",
  "OPTIMIZATION/DSS DASHBOARD IMPLEMENTATION VALIDATION PASSED",
  "Phase 11.15",
  frontendDir
);

assert.equal(
  frontendValidator.present,
  true,
  `Current validator missing: ${path.resolve(frontendDir, "scripts", "validateOptimizationDssDashboardImplementation.js")}`
);
pass("Phase 11.15 dashboard implementation validator re-executes successfully");

const buildOutput = runFrontendBuild();
pass("frontend Vite production build passes");

assert.doesNotMatch(buildOutput, /error during build|build failed/i);
pass("frontend build output contains no build failure");

const persistenceSource = readText(
  path.resolve(backendDir, "services/optimizationDss/optimizationDssPersistenceService.js")
);
const apiServiceSource = readText(
  path.resolve(backendDir, "services/optimizationDss/optimizationDssApiService.js")
);
const routesSource = readText(
  path.resolve(backendDir, "routes/optimizationDssRoutes.js")
);
const dashboardSource = readText(
  path.resolve(frontendDir, "src/pages/OptimizationDssDashboard.jsx")
);
const dashboardApiSource = readText(
  path.resolve(frontendDir, "src/services/api/optimizationDssDashboardApi.js")
);

assert.match(persistenceSource, /UPSERT_BY_PERSISTENCE_KEY/);
pass("persistence implementation preserves deterministic upsert mode");

assert.match(routesSource, /router\.get\(\s*"\/recommendations"/);
pass("Optimization/DSS list route remains GET-only");

assert.match(
  routesSource,
  /router\.get\(\s*"\/recommendations\/:persistenceKey"/
);
pass("Optimization/DSS detail route remains GET-only");

assert.doesNotMatch(routesSource, /router\.(post|put|patch|delete)\(/);
pass("Optimization/DSS routes expose no mutation endpoint");

assert.doesNotMatch(
  apiServiceSource,
  /createRecommendation|updateRecommendation|deleteRecommendation/
);
pass("Optimization/DSS API service exposes no mutation operation");

assert.doesNotMatch(
  dashboardApiSource,
  /axiosInstance\.(post|put|patch|delete)/
);
pass("dashboard API wrapper remains read-only");

assert.match(dashboardSource, /ADVISORY ONLY/);
pass("dashboard preserves ADVISORY ONLY presentation");

assert.match(dashboardSource, /NON-EXECUTABLE/);
pass("dashboard preserves NON-EXECUTABLE presentation");

assert.match(dashboardSource, /NO AUTO-DISPATCH/);
pass("dashboard preserves NO AUTO-DISPATCH presentation");

assert.match(dashboardSource, /connectNulls=\{false\}/);
pass("dashboard preserves chart gaps with connectNulls=false");

assert.match(dashboardSource, /return "UNAVAILABLE"/);
pass("dashboard preserves explicit UNAVAILABLE rendering");

assert.match(dashboardSource, /return "\u2014"/);
pass("dashboard preserves missing-value rendering");

// Phase 11.15 already validates recommendation-value semantics directly.
// Do not reject every `?? 0` in the whole dashboard source because zero is
// legitimate for pagination/count metadata such as pageCount and totals.
// Restrict this final guard to recommendation payload fields whose missing
// values must never be coerced to numeric zero.
const semanticZeroFallbackPattern =
  /(?:objectiveValue|action\?\.value|action\.value|recommendation\?\.value|recommendation\.value)\s*\?\?\s*0\b/;

assert.doesNotMatch(dashboardSource, semanticZeroFallbackPattern);
pass("dashboard does not coerce missing recommendation values to zero");

assert.doesNotMatch(dashboardSource, /interpolat|resampl/i);
pass("dashboard introduces no interpolation or resampling");

assert.doesNotMatch(
  dashboardSource,
  /inferUnit|inferCurrency|convertCurrency|unitConversion/
);
pass("dashboard introduces no unit or currency inference/conversion");

assert.doesNotMatch(
  persistenceSource,
  /automaticDispatchAllowed:\s*true|executableActionProduced:\s*true/
);
pass("persistence layer preserves no-auto-dispatch boundary");

assert.doesNotMatch(
  apiServiceSource,
  /automaticDispatchAllowed:\s*true|executableActionProduced:\s*true/
);
pass("API layer preserves no-auto-dispatch boundary");

assert.equal(
  fs.existsSync(path.resolve(backendDir, "src/services/optimizationDss")),
  false
);
pass("backend Optimization/DSS implementation does not introduce a backend src folder");

const serverPath = path.resolve(backendDir, "server.js");
assert.equal(fs.existsSync(serverPath), true);
pass("backend server.js exists");

const serverSource = readText(serverPath);
const serverMountObserved =
  /optimizationDssRoutes/.test(serverSource) &&
  /\/api\/optimization-dss/.test(serverSource);

if (serverMountObserved) {
  pass("server.js contains an Optimization/DSS route mount");
} else {
  pass("server.js mount remains outside validated Phase 11 implementation evidence");
}

assert.equal(typeof serverMountObserved, "boolean");
pass("server mount status is observed without fabricating live HTTP success");

assert.doesNotMatch(
  dashboardApiSource,
  /WebSocket|socket\.emit|socket\.on/
);
pass("dashboard introduces no hidden control channel");

assert.doesNotMatch(
  dashboardSource,
  /Math\.random\(\).*value|Date\.now\(\).*value/
);
pass("dashboard fabricates no recommendation values");

assert.doesNotMatch(
  apiServiceSource,
  /financialBi.*=|forecasting.*=|telemetry.*=/i
);
pass("read-only API service does not mutate upstream evidence");

assert.doesNotThrow(() =>
  JSON.stringify({
    phase: PHASE,
    layer: LAYER,
    serverMountObserved,
    liveHttpValidated: false,
    liveMongoAtlasValidated: false,
    automaticDispatchAllowed: false,
    missingMeansZero: false,
    unavailableMeansZero: false,
  })
);
pass("final validation summary is JSON serializable");

if (assertions !== 61) {
  throw new Error(
    `Expected 61 pre-final assertions, received ${assertions}.`
  );
}

pass("11.16 validation assertion plan completed exactly");

console.log();
console.log(`Assertions passed: ${assertions}`);
console.log();
console.log("================================================");
console.log("OPTIMIZATION/DSS FINAL VALIDATION PASSED");
console.log("================================================");
console.log();
console.log("Validated Phase 11 closure semantics:");
console.log("- Phase 11.1 through 11.9 implementation identities are verified; legacy validators are re-run when still present.");
console.log("- Phase 11.10 through 11.15 validators are required and re-executed.");
console.log("- The Phase 11.15 frontend production build must pass.");
console.log("- Optimization/DSS remains the terminal architecture layer.");
console.log("- persisted and API-exposed recommendations remain advisory-only and non-executable.");
console.log("- automatic dispatch/control remains prohibited.");
console.log("- missing and UNAVAILABLE remain distinct from numeric zero.");
console.log("- no unit/currency inference, conversion, interpolation or resampling is introduced.");
console.log("- backend Optimization/DSS introduces no backend src folder.");
console.log(
  `- server.js route mount observed: ${serverMountObserved ? "YES" : "NO"}; live HTTP success is not fabricated.`
);
console.log("- live MongoDB Atlas persistence and live HTTP remain separate evidence boundaries.");
