import {
  aggregateReliability,
} from "../services/reliability/reliabilityAggregationService.js";


function event({
  installation,
  start,
  end,
}) {
  return {
    installation,

    eventType:
      "GRID_OUTAGE",

    source:
      "DERIVED",

    detectionMethod:
      "ACTIVE_SOURCE_TRANSITION",

    status:
      "RESTORED",

    startTime:
      new Date(start),

    restorationTime:
      new Date(end),

    raw: {
      loadInterruptionConfirmed:
        false,

      eligibleForSaidiSaifi:
        false,

      eligibleForEns:
        false,
    },
  };
}


function assertEqual(
  actual,
  expected,
  label
) {
  if (actual !== expected) {
    throw new Error(
      `${label}: expected ${expected}, received ${actual}`
    );
  }

  console.log(
    `PASS: ${label} = ${actual}`
  );
}


function assertNear(
  actual,
  expected,
  tolerance,
  label
) {
  if (
    Math.abs(
      actual -
      expected
    ) >
    tolerance
  ) {
    throw new Error(
      `${label}: expected approximately ${expected}, received ${actual}`
    );
  }

  console.log(
    `PASS: ${label} = ${actual}`
  );
}


console.log("");
console.log(
  "================================================"
);
console.log(
  "ASHMAAN RELIABILITY OVERLAP VALIDATION"
);
console.log(
  "================================================"
);


/*
|--------------------------------------------------------------------------
| Reporting window
|--------------------------------------------------------------------------
|
| 00:00 → 04:00 = 4 hours
|
| Two observable installations:
| total exposure = 8 site-hours
|--------------------------------------------------------------------------
*/

const periodStart =
  new Date(
    "2026-09-05T00:00:00.000Z"
  );

const periodEnd =
  new Date(
    "2026-09-05T04:00:00.000Z"
  );


/*
|--------------------------------------------------------------------------
| Installation A
|--------------------------------------------------------------------------
|
| Event 1: 00:30 → 01:30
| Event 2: 01:00 → 02:00
|
| Raw event duration sum = 2.0 hours
| Correct merged duration = 1.5 hours
| Correct interruption episodes = 1
|--------------------------------------------------------------------------
*/


/*
|--------------------------------------------------------------------------
| Installation B
|--------------------------------------------------------------------------
|
| Event 3: 02:30 → 03:00
| Event 4: 03:30 → 04:00
|
| No overlap.
| Correct duration = 1.0 hour
| Correct interruption episodes = 2
|--------------------------------------------------------------------------
*/


const events = [
  event({
    installation:
      "INSTALLATION-A",

    start:
      "2026-09-05T00:30:00.000Z",

    end:
      "2026-09-05T01:30:00.000Z",
  }),

  event({
    installation:
      "INSTALLATION-A",

    start:
      "2026-09-05T01:00:00.000Z",

    end:
      "2026-09-05T02:00:00.000Z",
  }),

  event({
    installation:
      "INSTALLATION-B",

    start:
      "2026-09-05T02:30:00.000Z",

    end:
      "2026-09-05T03:00:00.000Z",
  }),

  event({
    installation:
      "INSTALLATION-B",

    start:
      "2026-09-05T03:30:00.000Z",

    end:
      "2026-09-05T04:00:00.000Z",
  }),
];


const result =
  aggregateReliability({
    events,

    periodStart,
    periodEnd,

    gridObservableInstallationIds: [
      "INSTALLATION-A",
      "INSTALLATION-B",
    ],

    serviceObservableInstallationIds:
      [],
  });


console.log("");
console.log(
  "------------------------------------------------"
);

console.log(
  `Raw source events: ${result.gridSource.sourceEventCount}`
);

console.log(
  `Merged interruption episodes: ${result.gridSource.interruptionCount}`
);

console.log(
  `Affected installations: ${result.gridSource.affectedInstallationCount}`
);

console.log(
  `Interruption site-hours: ${result.gridSource.interruptionHours}`
);

console.log(
  `Exposure site-hours: ${result.observability.gridSource.exposureHours}`
);

console.log(
  `Availability: ${result.gridSource.availability}`
);


/*
|--------------------------------------------------------------------------
| Assertions
|--------------------------------------------------------------------------
*/

assertEqual(
  result.gridSource
    .sourceEventCount,
  4,
  "Raw source event count"
);


assertEqual(
  result.gridSource
    .interruptionCount,
  3,
  "Merged interruption episode count"
);


assertEqual(
  result.gridSource
    .affectedInstallationCount,
  2,
  "Affected installation count"
);


assertNear(
  result.gridSource
    .interruptionHours,
  2.5,
  0.000001,
  "Merged interruption site-hours"
);


assertNear(
  result.observability
    .gridSource
    .exposureHours,
  8,
  0.000001,
  "Observable site-hours"
);


/*
| Availability:
|
| 1 - 2.5 / 8
| = 0.6875
| = 68.75%
*/

assertNear(
  result.gridSource
    .availability,
  0.6875,
  0.000001,
  "Grid-source availability"
);


assertEqual(
  result.service
    .availabilityStatus,
  "NOT_OBSERVABLE",
  "Service observability status"
);


assertEqual(
  result.saidiSaifiFoundation
    .eligibleEventCount,
  0,
  "SAIDI/SAIFI eligible events"
);


assertEqual(
  result.ensFoundation
    .eligibleEventCount,
  0,
  "ENS eligible events"
);


console.log("");
console.log(
  "================================================"
);
console.log(
  "OVERLAP VALIDATION PASSED"
);
console.log(
  "================================================"
);