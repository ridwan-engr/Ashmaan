import fs from "node:fs";
import path from "node:path";
import {
  fileURLToPath,
} from "node:url";

const __filename =
  fileURLToPath(
    import.meta.url
  );

const __dirname =
  path.dirname(
    __filename
  );

const backendRoot =
  path.resolve(
    __dirname,
    ".."
  );

const serverPath =
  path.join(
    backendRoot,
    "server.js"
  );

const envPath =
  path.join(
    backendRoot,
    "config",
    "env.js"
  );

const serverSource =
  fs.readFileSync(
    serverPath,
    "utf8"
  );

const envSource =
  fs.readFileSync(
    envPath,
    "utf8"
  );

let passCount = 0;
let failCount = 0;

const check = (
  condition,
  message
) => {
  if (condition) {
    passCount += 1;

    console.log(
      `PASS ${passCount}: ${message}`
    );

    return;
  }

  failCount += 1;

  console.error(
    `FAIL ${failCount}: ${message}`
  );
};

console.log(
  "=================================================="
);

console.log(
  "ASHMAAN VRM LIVE SERVER LIFECYCLE INTEGRATION"
);

console.log(
  "=================================================="
);

check(
  envSource.includes(
    "VRM_LIVE_FLEET_ENABLED"
  ),
  "live fleet has an explicit environment enablement control"
);

check(
  envSource.includes(
    "VRM_LIVE_FLEET_STARTUP_CONCURRENCY"
  ),
  "live fleet startup concurrency is explicitly configurable"
);

check(
  envSource.includes(
    "liveFleetEnabled"
  ),
  "normalized live-fleet enablement is exposed through env configuration"
);

check(
  envSource.includes(
    "liveFleetStartupConcurrency"
  ),
  "normalized live-fleet startup concurrency is exposed through env configuration"
);

check(
  serverSource.includes(
    "startVrmLiveFleet"
  ),
  "server imports and integrates bounded VRM live-fleet startup"
);

check(
  serverSource.includes(
    "stopVrmLiveFleet"
  ),
  "server imports and integrates VRM live-fleet shutdown"
);

check(
  serverSource.includes(
    "getVrmLiveFleetState"
  ),
  "server can report the resulting live-fleet runtime state"
);

check(
  /if\s*\(\s*env\.vrm\.liveFleetEnabled\s*\)/.test(
    serverSource
  ),
  "production MQTT fleet startup is configuration-gated"
);

check(
  serverSource.includes(
    "await startVrmLiveFleet"
  ),
  "server awaits bounded live-fleet startup"
);

check(
  /siteIds\s*:\s*env\.vrm\.liveFleetSiteIds/.test(
    serverSource
  ),
  "server passes configured site scope into live-fleet startup"
);

check(
  serverSource.includes(
    "ALL_QUALIFIED"
  ) &&
    serverSource.includes(
      "\"NONE\""
    ),
  "server reports unrestricted and fail-closed live-fleet scopes explicitly"
);

check(
  serverSource.includes(
    "scope=${liveFleetScope}"
  ),
  "server exposes selected live-fleet scope in startup diagnostics"
);

check(
  serverSource.includes(
    "await stopVrmLiveFleet"
  ),
  "graceful shutdown awaits live-fleet termination"
);

const schedulerStopIndex =
  serverSource.indexOf(
    "stopVrmScheduler();"
  );

const fleetStopIndex =
  serverSource.indexOf(
    "await stopVrmLiveFleet"
  );

const socketStopIndex =
  serverSource.indexOf(
    "await closeSocketServer();"
  );

const databaseStopIndex =
  serverSource.indexOf(
    "await mongoose.disconnect();"
  );

check(
  schedulerStopIndex !== -1 &&
    fleetStopIndex !== -1 &&
    schedulerStopIndex <
      fleetStopIndex,
  "scheduler shutdown begins before live-fleet teardown"
);

check(
  fleetStopIndex !== -1 &&
    socketStopIndex !== -1 &&
    fleetStopIndex <
      socketStopIndex,
  "VRM MQTT fleet stops before Socket.IO transport"
);

check(
  socketStopIndex !== -1 &&
    databaseStopIndex !== -1 &&
    socketStopIndex <
      databaseStopIndex,
  "Socket.IO teardown occurs before MongoDB disconnect"
);

check(
  serverSource.includes(
    "server.once("
  ) &&
    serverSource.includes(
      "\"listening\""
    ) &&
    serverSource.includes(
      "await new Promise("
    ),
  "HTTP listener readiness is awaited before dependent runtime startup"
);

check(
  !serverSource.includes(
    "N/<portal>/#"
  ) &&
    !serverSource.includes(
      "W/<portal>"
    ),
  "server lifecycle integration introduces no MQTT wildcard or write-topic behavior"
);

console.log();

console.log(
  "=================================================="
);

console.log(
  `PASS: ${passCount}`
);

console.log(
  `FAIL: ${failCount}`
);

if (
  failCount === 0
) {
  console.log(
    "L.3J-H VRM LIVE SERVER LIFECYCLE INTEGRATION: PASS"
  );
} else {
  console.log(
    "L.3J-H VRM LIVE SERVER LIFECYCLE INTEGRATION: FAIL"
  );

  process.exitCode = 1;
}