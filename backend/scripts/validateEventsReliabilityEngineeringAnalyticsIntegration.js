import assert from "node:assert/strict";

import {
    integrateProductionGridInterruptions,
} from "../services/engineering/gridProductionInterruptionIntegrationService.js";

import {
    EVENTS_ENGINEERING_INTEGRATION_PHASE,
    EVENTS_ENGINEERING_INTEGRATION_LAYER,
    EVENTS_ENGINEERING_INTEGRATION_UPSTREAM_PHASE,
    EVENTS_ENGINEERING_INTEGRATION_UPSTREAM_LAYER,
    EVENTS_ENGINEERING_INTEGRATION_TARGET_PHASE,
    EVENTS_ENGINEERING_INTEGRATION_TARGET_LAYER,
    EVENTS_ENGINEERING_INTEGRATION_INTERVAL,
    EVENTS_ENGINEERING_INTEGRATION_STATUS,
    EVENTS_ENGINEERING_INTEGRATION_BOUNDARIES,

    validateEventsReliabilityUpstream,
    validateEngineeringGridInput,
    validateEventsEngineeringAlignment,
    qualifyEventsReliabilityEngineeringIntegration,
    executeEventsReliabilityEngineeringIntegration,
} from "../services/integration/eventsReliabilityEngineeringAnalyticsIntegrationService.js";


let checks = 0;


function pass(
    message
) {
    checks += 1;

    console.log(
        `PASS ${checks}: ${message}`
    );
}


function expectThrow(
    fn,
    pattern,
    message
) {
    assert.throws(
        fn,
        pattern
    );

    pass(
        message
    );
}


console.log("");
console.log(
    "================================================"
);
console.log(
    "ASHMAAN PHASE 12.4 EVENTS / RELIABILITY → ENGINEERING ANALYTICS INTEGRATION"
);
console.log(
    "================================================"
);
console.log("");


/*
|--------------------------------------------------------------------------
| Contract identity
|--------------------------------------------------------------------------
*/

assert.equal(
    EVENTS_ENGINEERING_INTEGRATION_PHASE,
    "12.4"
);

pass(
    "integration phase is 12.4"
);


assert.equal(
    EVENTS_ENGINEERING_INTEGRATION_LAYER,
    "EVENTS_RELIABILITY_ENGINEERING_ANALYTICS_INTEGRATION"
);

pass(
    "integration layer is explicit"
);


assert.equal(
    EVENTS_ENGINEERING_INTEGRATION_UPSTREAM_PHASE,
    "12.3"
);

assert.equal(
    EVENTS_ENGINEERING_INTEGRATION_UPSTREAM_LAYER,
    "DATABASE_EVENTS_RELIABILITY_INTEGRATION"
);

pass(
    "Phase 12.3 is the explicit upstream integration boundary"
);


assert.equal(
    EVENTS_ENGINEERING_INTEGRATION_TARGET_PHASE,
    "8.6H-E"
);

assert.equal(
    EVENTS_ENGINEERING_INTEGRATION_TARGET_LAYER,
    "PRODUCTION"
);

pass(
    "existing Phase 8.6H-E production integration is the target"
);


assert.equal(
    EVENTS_ENGINEERING_INTEGRATION_INTERVAL,
    "[start,end)"
);

pass(
    "half-open reporting interval is explicit"
);


/*
|--------------------------------------------------------------------------
| Semantic boundaries
|--------------------------------------------------------------------------
*/

assert.equal(
    EVENTS_ENGINEERING_INTEGRATION_BOUNDARIES
        .usesExistingPhase8ProductionIntegration,
    true
);

assert.equal(
    EVENTS_ENGINEERING_INTEGRATION_BOUNDARIES
        .createsParallelEngineeringAnalytics,
    false
);

pass(
    "12.4 delegates to existing Phase 8 production analytics"
);


assert.equal(
    EVENTS_ENGINEERING_INTEGRATION_BOUNDARIES
        .createsParallelOutageDetector,
    false
);

assert.equal(
    EVENTS_ENGINEERING_INTEGRATION_BOUNDARIES
        .createsParallelOutagePersistence,
    false
);

pass(
    "12.4 creates no duplicate outage detector or persistence path"
);


assert.equal(
    EVENTS_ENGINEERING_INTEGRATION_BOUNDARIES
        .phase7EventsAuthoritative,
    true
);

assert.equal(
    EVENTS_ENGINEERING_INTEGRATION_BOUNDARIES
        .phase7EventsMutated,
    false
);

pass(
    "Phase 7 outage evidence remains authoritative and immutable"
);


assert.equal(
    EVENTS_ENGINEERING_INTEGRATION_BOUNDARIES
        .customerInterruptionInferred,
    false
);

assert.equal(
    EVENTS_ENGINEERING_INTEGRATION_BOUNDARIES
        .gridElectricalAbsenceInferred,
    false
);

pass(
    "customer interruption and grid electrical absence are not inferred"
);


assert.equal(
    EVENTS_ENGINEERING_INTEGRATION_BOUNDARIES
        .saidiSaifiEligibilityChanged,
    false
);

assert.equal(
    EVENTS_ENGINEERING_INTEGRATION_BOUNDARIES
        .ensEligibilityChanged,
    false
);

assert.equal(
    EVENTS_ENGINEERING_INTEGRATION_BOUNDARIES
        .ensCalculated,
    false
);

pass(
    "12.4 does not establish SAIDI/SAIFI or ENS semantics"
);


assert.equal(
    EVENTS_ENGINEERING_INTEGRATION_BOUNDARIES
        .missingMeansZero,
    false
);

assert.equal(
    EVENTS_ENGINEERING_INTEGRATION_BOUNDARIES
        .unavailableMeansZero,
    false
);

pass(
    "missing and unavailable engineering evidence remain distinct from zero"
);


assert.equal(
    EVENTS_ENGINEERING_INTEGRATION_BOUNDARIES
        .unitInferenceAllowed,
    false
);

assert.equal(
    EVENTS_ENGINEERING_INTEGRATION_BOUNDARIES
        .directionInferenceAllowed,
    false
);

assert.equal(
    EVENTS_ENGINEERING_INTEGRATION_BOUNDARIES
        .topologyInferenceAllowed,
    false
);

pass(
    "unit, direction, and topology inference remain blocked"
);


/*
|--------------------------------------------------------------------------
| Deterministic upstream Phase 12.3 evidence
|--------------------------------------------------------------------------
*/

const scopeIdentity =
    Object.freeze({
        vrmSiteId:
            "VRM-12-4-TEST",
    });


const horizon =
    Object.freeze({
        start:
            "2026-09-10T00:00:00.000Z",

        end:
            "2026-09-10T01:00:00.000Z",

        interval:
            "[start,end)",
    });


const evidenceRefs =
    Object.freeze([
        "phase-12.3-runtime-pass",
    ]);


const upstreamIntegration =
    Object.freeze({
        phase:
            "12.3",

        layer:
            "DATABASE_EVENTS_RELIABILITY_INTEGRATION",

        status:
            "EXECUTED",

        executed:
            true,

        scope:
            "SITE",

        scopeIdentity,

        horizon,

        evidenceRefs,

        events: {
            episodeCount:
                1,
        },

        reliability: {
            totalSeconds:
                600,
        },
    });


/*
|--------------------------------------------------------------------------
| Canonical production Phase 8.6H-D fixture
|--------------------------------------------------------------------------
|
| Source-state may itself be UNAVAILABLE.
|
| H-E requires that H-D executed, not that every engineering metric was
| available. This preserves Engineering Analytics semantics:
|
| UNAVAILABLE != zero
|--------------------------------------------------------------------------
*/

const sourceStateValue =
    Object.freeze({
        family:
            "GRID_SOURCE_STATE",

        status:
            "UNAVAILABLE",

        reason:
            "SOURCE_STATE_NOT_OBSERVABLE",

        intervals:
            Object.freeze([]),
    });


const engineeringSiteResult = {
    phase:
        "8.6H-D",

    layer:
        "PRODUCTION",

    family:
        "GRID",

    installation: {
        id:
            "installation-12-4",

        vrmSiteId:
            "VRM-12-4-TEST",
    },

    reportingWindow: {
        start:
            "2026-09-10T00:00:00.000Z",

        end:
            "2026-09-10T01:00:00.000Z",

        semantics:
            "[start,end)",
    },

    queryWindow: {
        start:
            "2026-09-10T00:00:00.000Z",

        end:
            "2026-09-10T01:00:00.000Z",
    },

    evidence: {
        records:
            [],

        diagnostics:
            {},
    },

    analytics: {
        sourceState: {
            status:
                "INTEGRATED",

            phase:
                "8.6H-C",

            reason:
                "SOURCE_STATE_NOT_OBSERVABLE",

            value:
                sourceStateValue,
        },

        power: {
            status:
                "INTEGRATED",

            phase:
                "8.6H-D",

            reason:
                null,

            value: {
                status:
                    "UNAVAILABLE",
            },
        },

        energy: {
            status:
                "INTEGRATED",

            phase:
                "8.6H-D",

            reason:
                null,

            value: {
                status:
                    "UNAVAILABLE",
            },
        },
    },

    boundaries: {
        sourceStateCalculated:
            true,

        gridPowerCalculated:
            true,

        gridEnergyCalculated:
            true,

        interruptionsIntegrated:
            false,

        gridQualityCalculated:
            false,

        phase7EventsModified:
            false,

        customerInterruptionEstablished:
            false,

        saidiSaifiEligibilityChanged:
            false,

        ensEligibilityChanged:
            false,

        missingMeansZero:
            false,

        unitInferenceAllowed:
            false,

        directionInferenceAllowed:
            false,

        importExportEstablished:
            false,
    },
};


/*
|--------------------------------------------------------------------------
| Deterministic authoritative Phase 7 OutageEvent
|--------------------------------------------------------------------------
|
| 00:10 → 00:20 = 600 seconds = 1/6 hour.
|
| Customer interruption / SAIDI / ENS evidence is deliberately false.
|--------------------------------------------------------------------------
*/

const phase7Event = {
    _id:
        "outage-event-12-4",

    installation:
        "installation-12-4",

    site:
        "site-12-4",

    eventType:
        "GRID_OUTAGE",

    source:
        "DERIVED",

    detectionMethod:
        "ACTIVE_SOURCE_TRANSITION",

    status:
        "RESTORED",

    startTime:
        new Date(
            "2026-09-10T00:10:00.000Z"
        ),

    detectionTime:
        new Date(
            "2026-09-10T00:10:00.000Z"
        ),

    restorationTime:
        new Date(
            "2026-09-10T00:20:00.000Z"
        ),

    endTime:
        new Date(
            "2026-09-10T00:20:00.000Z"
        ),

    durationSeconds:
        600,

    affectedLoadKw:
        null,

    energyNotSuppliedKwh:
        null,

    affectedCustomers:
        null,

    raw: {
        gridSourceInterrupted:
            true,

        gridElectricalAbsenceConfirmed:
            false,

        loadInterruptionConfirmed:
            false,

        eligibleForGridAvailability:
            true,

        eligibleForSaidiSaifi:
            false,

        eligibleForEns:
            false,
    },
};


/*
|--------------------------------------------------------------------------
| Mock OutageEvent.find().sort().lean() production query chain
|--------------------------------------------------------------------------
*/

let findCalls =
    0;

let sortCalls =
    0;

let leanCalls =
    0;

let capturedQuery =
    null;

let capturedSort =
    null;


const outageEventModel = {
    find(
        query
    ) {
        findCalls +=
            1;

        capturedQuery =
            query;

        return {
            sort(
                sortSpec
            ) {
                sortCalls +=
                    1;

                capturedSort =
                    sortSpec;

                return {
                    async lean() {
                        leanCalls +=
                            1;

                        return [
                            phase7Event,
                        ];
                    },
                };
            },
        };
    },
};


/*
|--------------------------------------------------------------------------
| Real Phase 8.6H-E integration wrapper
|--------------------------------------------------------------------------
*/

let integrationCalls =
    0;

let integrationArgs =
    null;


async function productionInterruptionIntegrator({
    siteResult,
} = {}) {
    integrationCalls +=
        1;

    integrationArgs = {
        siteResult,
    };


    return integrateProductionGridInterruptions({
        siteResult,

        outageEventModel,
    });
}


/*
|--------------------------------------------------------------------------
| Upstream validation
|--------------------------------------------------------------------------
*/

const upstreamValidation =
    validateEventsReliabilityUpstream(
        upstreamIntegration
    );


assert.equal(
    upstreamValidation.valid,
    true
);

assert.equal(
    upstreamValidation.vrmSiteId,
    "VRM-12-4-TEST"
);

pass(
    "successful SITE-scoped Phase 12.3 evidence validates"
);


/*
|--------------------------------------------------------------------------
| Engineering H-D validation
|--------------------------------------------------------------------------
*/

const engineeringValidation =
    validateEngineeringGridInput(
        engineeringSiteResult
    );


assert.equal(
    engineeringValidation.valid,
    true
);

assert.equal(
    engineeringValidation.installationId,
    "installation-12-4"
);

assert.equal(
    engineeringValidation.vrmSiteId,
    "VRM-12-4-TEST"
);

pass(
    "canonical Phase 8.6H-D production GRID result validates"
);


const alignment =
    validateEventsEngineeringAlignment({
        upstreamValidation,

        engineeringValidation,
    });


assert.equal(
    alignment.valid,
    true
);

pass(
    "Phase 12.3 and Phase 8 SITE identity/window align exactly"
);


/*
|--------------------------------------------------------------------------
| Qualification
|--------------------------------------------------------------------------
*/

const qualified =
    qualifyEventsReliabilityEngineeringIntegration({
        upstreamIntegration,

        engineeringSiteResult,

        productionInterruptionIntegrator,
    });


assert.equal(
    qualified.status,
    "QUALIFIED"
);

assert.equal(
    qualified.executed,
    false
);

pass(
    "aligned Phase 12.3 and Phase 8.6H-D evidence qualifies"
);


assert.strictEqual(
    qualified.scopeIdentity,
    scopeIdentity
);

assert.strictEqual(
    qualified.horizon,
    horizon
);

assert.strictEqual(
    qualified.evidenceRefs,
    evidenceRefs
);

pass(
    "scope identity, horizon, and evidence references propagate unchanged"
);


assert.strictEqual(
    qualified.engineeringSiteResult,
    engineeringSiteResult
);

pass(
    "qualification preserves the Phase 8.6H-D result by reference"
);


assert.equal(
    findCalls,
    0
);

assert.equal(
    integrationCalls,
    0
);

pass(
    "qualification performs no OutageEvent query or engineering calculation"
);


/*
|--------------------------------------------------------------------------
| Execute real production Phase 8.6H-E path
|--------------------------------------------------------------------------
*/

const result =
    await executeEventsReliabilityEngineeringIntegration({
        qualifiedIntegration:
            qualified,
    });


assert.equal(
    result.status,
    "EXECUTED"
);

assert.equal(
    result.executed,
    true
);

pass(
    "Phase 12.4 executes successfully"
);


assert.equal(
    integrationCalls,
    1
);

assert.strictEqual(
    integrationArgs.siteResult,
    engineeringSiteResult
);

pass(
    "existing production H-E integrator is delegated exactly once"
);


assert.equal(
    findCalls,
    1
);

assert.equal(
    sortCalls,
    1
);

assert.equal(
    leanCalls,
    1
);

pass(
    "real H-E path performs one sortable lean Phase 7 event query"
);


/*
|--------------------------------------------------------------------------
| Verify authoritative SITE-scoped Mongo query
|--------------------------------------------------------------------------
*/

assert.equal(
    capturedQuery.installation,
    "installation-12-4"
);

pass(
    "OutageEvent query is installation-scoped"
);


assert.equal(
    capturedQuery.eventType,
    "GRID_OUTAGE"
);

assert.equal(
    capturedQuery.source,
    "DERIVED"
);

assert.equal(
    capturedQuery.detectionMethod,
    "ACTIVE_SOURCE_TRANSITION"
);

pass(
    "OutageEvent query uses canonical Phase 7 grid-event identity"
);


assert.deepEqual(
    capturedQuery.status.$in,
    [
        "OPEN",
        "RESTORED",
    ]
);

pass(
    "OutageEvent query accepts only OPEN and RESTORED lifecycle states"
);


assert.equal(
    capturedQuery.startTime.$lt
        .toISOString(),
    "2026-09-10T01:00:00.000Z"
);

pass(
    "event start must be before reporting-window end"
);


assert.equal(
    capturedQuery.$or[0]
        .status,
    "OPEN"
);

assert.equal(
    capturedQuery.$or[1]
        .restorationTime
        .$gt
        .toISOString(),
    "2026-09-10T00:00:00.000Z"
);

assert.equal(
    capturedQuery.$or[2]
        .endTime
        .$gt
        .toISOString(),
    "2026-09-10T00:00:00.000Z"
);

pass(
    "OutageEvent overlap query preserves [start,end) lifecycle semantics"
);


assert.deepEqual(
    capturedSort,
    {
        startTime:
            1,
    }
);

pass(
    "Phase 7 event evidence is deterministically sorted by startTime"
);


/*
|--------------------------------------------------------------------------
| Verify real Phase 8.6H-E result
|--------------------------------------------------------------------------
*/

const engineeringResult =
    result.engineeringResult;


assert.equal(
    engineeringResult.phase,
    "8.6H-E"
);

assert.equal(
    engineeringResult.family,
    "GRID"
);

assert.equal(
    engineeringResult.layer,
    "PRODUCTION"
);

pass(
    "real Phase 8 production result advances from H-D to H-E"
);


assert.equal(
    engineeringResult
        .analytics
        .interruptions
        .status,
    "INTEGRATED"
);

assert.equal(
    engineeringResult
        .analytics
        .interruptions
        .phase,
    "8.6H-E"
);

pass(
    "H-E writes only the production interruption integration stage"
);


const interruptionValue =
    engineeringResult
        .analytics
        .interruptions
        .value;


assert.equal(
    interruptionValue.family,
    "GRID_INTERRUPTION_RESTORATION"
);

assert.equal(
    interruptionValue
        .metrics
        .interruptionCount,
    1
);

assert.equal(
    interruptionValue
        .metrics
        .restoredInterruptionCount,
    1
);

assert.equal(
    interruptionValue
        .metrics
        .openInterruptionCount,
    0
);

pass(
    "authoritative restored Phase 7 event reaches Engineering Analytics"
);


assert.ok(
    Math.abs(
        interruptionValue
            .metrics
            .interruptionHours -
        (
            600 /
            3600
        )
    ) <
    1e-12
);

pass(
    "engineering interruption exposure equals the persisted 600-second event"
);


assert.equal(
    interruptionValue
        .metrics
        .serviceInterruptionCount,
    0
);

assert.equal(
    interruptionValue
        .metrics
        .saidiSaifiEligibleCount,
    0
);

assert.equal(
    interruptionValue
        .metrics
        .ensEligibleCount,
    0
);

pass(
    "grid-source event is not promoted to customer/SAIDI/SAIFI/ENS evidence"
);


/*
|--------------------------------------------------------------------------
| Source-state corroboration is non-authoritative
|--------------------------------------------------------------------------
|
| The fixture deliberately has no qualified source-state intervals.
|
| Phase 7 event evidence therefore remains present, while the Phase 8
| integration may report PARTIALLY_CALCULATED because corroboration is
| incomplete.
|--------------------------------------------------------------------------
*/

assert.equal(
    interruptionValue.events.length,
    1
);

assert.equal(
    interruptionValue.events[0]
        .eventType,
    "GRID_OUTAGE"
);

pass(
    "lack of source-state corroboration does not delete authoritative Phase 7 evidence"
);


assert.equal(
    interruptionValue.status,
    "PARTIALLY_CALCULATED"
);

pass(
    "uncorroborated persisted event becomes partial analytics, not fabricated certainty"
);


/*
|--------------------------------------------------------------------------
| Phase 8 semantic boundaries
|--------------------------------------------------------------------------
*/

assert.equal(
    engineeringResult
        .boundaries
        .interruptionsIntegrated,
    true
);

assert.equal(
    engineeringResult
        .boundaries
        .phase7EventsModified,
    false
);

pass(
    "H-E integrates interruptions without modifying Phase 7 events"
);


assert.equal(
    engineeringResult
        .boundaries
        .customerInterruptionEstablished,
    false
);

assert.equal(
    engineeringResult
        .boundaries
        .gridElectricalAbsenceInferred,
    false
);

pass(
    "H-E establishes neither customer interruption nor electrical grid absence"
);


assert.equal(
    engineeringResult
        .boundaries
        .saidiSaifiEligibilityChanged,
    false
);

assert.equal(
    engineeringResult
        .boundaries
        .ensEligibilityChanged,
    false
);

pass(
    "H-E does not alter reliability eligibility"
);


assert.equal(
    engineeringResult
        .boundaries
        .affectedCustomersInferred,
    false
);

assert.equal(
    engineeringResult
        .boundaries
        .ensCalculatedByGridIntegration,
    false
);

pass(
    "H-E infers no affected customers and calculates no ENS"
);


assert.equal(
    engineeringResult
        .boundaries
        .sourceStateCorroborativeOnly,
    true
);

assert.equal(
    engineeringResult
        .boundaries
        .phase7OutageEventsAuthoritative,
    true
);

pass(
    "source state remains corroborative while Phase 7 remains authoritative"
);


/*
|--------------------------------------------------------------------------
| 12.4 output identity preservation
|--------------------------------------------------------------------------
*/

assert.strictEqual(
    result.scopeIdentity,
    scopeIdentity
);

assert.strictEqual(
    result.horizon,
    horizon
);

assert.strictEqual(
    result.evidenceRefs,
    evidenceRefs
);

pass(
    "12.4 execution preserves scope, horizon, and evidence references"
);


/*
|--------------------------------------------------------------------------
| Rejection: missing/wrong Phase 12.3 evidence
|--------------------------------------------------------------------------
*/

expectThrow(
    () =>
        qualifyEventsReliabilityEngineeringIntegration({
            upstreamIntegration:
                null,

            engineeringSiteResult,

            productionInterruptionIntegrator,
        }),

    /UPSTREAM_12_3_INTEGRATION_REQUIRED/,

    "missing Phase 12.3 evidence is rejected"
);


expectThrow(
    () =>
        qualifyEventsReliabilityEngineeringIntegration({
            upstreamIntegration: {
                ...upstreamIntegration,

                phase:
                    "12.2",
            },

            engineeringSiteResult,

            productionInterruptionIntegrator,
        }),

    /PHASE_12_3_REQUIRED/,

    "wrong upstream phase is rejected"
);


expectThrow(
    () =>
        qualifyEventsReliabilityEngineeringIntegration({
            upstreamIntegration: {
                ...upstreamIntegration,

                status:
                    "ERROR",

                executed:
                    false,
            },

            engineeringSiteResult,

            productionInterruptionIntegrator,
        }),

    /SUCCESSFUL_12_3_EXECUTION_REQUIRED/,

    "failed Phase 12.3 execution is rejected"
);


expectThrow(
    () =>
        qualifyEventsReliabilityEngineeringIntegration({
            upstreamIntegration: {
                ...upstreamIntegration,

                scope:
                    "FLEET",
            },

            engineeringSiteResult,

            productionInterruptionIntegrator,
        }),

    /SITE_SCOPE_REQUIRED/,

    "FLEET upstream evidence is rejected"
);


/*
|--------------------------------------------------------------------------
| Rejection: invalid H-D evidence
|--------------------------------------------------------------------------
*/

expectThrow(
    () =>
        qualifyEventsReliabilityEngineeringIntegration({
            upstreamIntegration,

            engineeringSiteResult: {
                ...engineeringSiteResult,

                phase:
                    "8.6H-C",
            },

            productionInterruptionIntegrator,
        }),

    /PHASE_8_6H_D_REQUIRED/,

    "Phase 8.6H-C cannot bypass required H-D integration"
);


expectThrow(
    () =>
        qualifyEventsReliabilityEngineeringIntegration({
            upstreamIntegration,

            engineeringSiteResult: {
                ...engineeringSiteResult,

                analytics: {
                    ...engineeringSiteResult.analytics,

                    power: {
                        status:
                            "UNAVAILABLE",
                    },
                },
            },

            productionInterruptionIntegrator,
        }),

    /GRID_POWER_INTEGRATION_REQUIRED/,

    "missing H-D power integration is rejected"
);


expectThrow(
    () =>
        qualifyEventsReliabilityEngineeringIntegration({
            upstreamIntegration,

            engineeringSiteResult: {
                ...engineeringSiteResult,

                analytics: {
                    ...engineeringSiteResult.analytics,

                    energy: {
                        status:
                            "UNAVAILABLE",
                    },
                },
            },

            productionInterruptionIntegrator,
        }),

    /GRID_ENERGY_INTEGRATION_REQUIRED/,

    "missing H-D energy integration is rejected"
);


/*
|--------------------------------------------------------------------------
| Cross-layer identity mismatch
|--------------------------------------------------------------------------
*/

expectThrow(
    () =>
        qualifyEventsReliabilityEngineeringIntegration({
            upstreamIntegration,

            engineeringSiteResult: {
                ...engineeringSiteResult,

                installation: {
                    ...engineeringSiteResult.installation,

                    vrmSiteId:
                        "DIFFERENT-VRM-SITE",
                },
            },

            productionInterruptionIntegrator,
        }),

    /VRM_SITE_IDENTITY_MISMATCH/,

    "cross-layer vrmSiteId mismatch is rejected"
);


/*
|--------------------------------------------------------------------------
| Cross-layer start/end mismatch
|--------------------------------------------------------------------------
*/

expectThrow(
    () =>
        qualifyEventsReliabilityEngineeringIntegration({
            upstreamIntegration,

            engineeringSiteResult: {
                ...engineeringSiteResult,

                reportingWindow: {
                    ...engineeringSiteResult.reportingWindow,

                    start:
                        "2026-09-10T00:01:00.000Z",
                },
            },

            productionInterruptionIntegrator,
        }),

    /REPORTING_WINDOW_START_MISMATCH/,

    "reporting-window start mismatch is rejected"
);


expectThrow(
    () =>
        qualifyEventsReliabilityEngineeringIntegration({
            upstreamIntegration,

            engineeringSiteResult: {
                ...engineeringSiteResult,

                reportingWindow: {
                    ...engineeringSiteResult.reportingWindow,

                    end:
                        "2026-09-10T00:59:00.000Z",
                },
            },

            productionInterruptionIntegrator,
        }),

    /REPORTING_WINDOW_END_MISMATCH/,

    "reporting-window end mismatch is rejected"
);


/*
|--------------------------------------------------------------------------
| Missing production integrator
|--------------------------------------------------------------------------
*/

expectThrow(
    () =>
        qualifyEventsReliabilityEngineeringIntegration({
            upstreamIntegration,

            engineeringSiteResult,

            productionInterruptionIntegrator:
                null,
        }),

    /productionInterruptionIntegrator must be a function/,

    "missing production H-E integrator is rejected"
);


/*
|--------------------------------------------------------------------------
| Execution failure propagation
|--------------------------------------------------------------------------
*/

const failingQualified =
    qualifyEventsReliabilityEngineeringIntegration({
        upstreamIntegration,

        engineeringSiteResult,

        productionInterruptionIntegrator:
            async () => {
                throw new Error(
                    "SIMULATED_PHASE_8_FAILURE"
                );
            },
    });


const failingResult =
    await executeEventsReliabilityEngineeringIntegration({
        qualifiedIntegration:
            failingQualified,
    });


assert.equal(
    failingResult.status,
    EVENTS_ENGINEERING_INTEGRATION_STATUS
        .ERROR
);

assert.equal(
    failingResult.executed,
    false
);

assert.equal(
    failingResult.error.message,
    "SIMULATED_PHASE_8_FAILURE"
);

pass(
    "Phase 8 execution failure becomes explicit 12.4 ERROR evidence"
);


assert.strictEqual(
    failingResult.scopeIdentity,
    scopeIdentity
);

assert.strictEqual(
    failingResult.horizon,
    horizon
);

pass(
    "ERROR propagation preserves SITE identity and reporting horizon"
);


/*
|--------------------------------------------------------------------------
| Final exact assertion plan
|--------------------------------------------------------------------------
*/

assert.equal(
    checks,
    54
);

pass(
    "12.4 assertion plan completed exactly"
);


console.log("");
console.log(
    `Assertions passed: ${checks}`
);

console.log(
    "================================================"
);

console.log(
    "ASHMAAN PHASE 12.4 EVENTS / RELIABILITY → ENGINEERING ANALYTICS INTEGRATION PASSED"
);

console.log(
    "================================================"
);