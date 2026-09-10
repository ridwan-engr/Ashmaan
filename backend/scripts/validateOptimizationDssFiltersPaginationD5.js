// ASHMAAN Post-Phase-11 Runtime Hardening D.5
// Filters + pagination runtime validation.
//
// Normal mode:
//   - creates 27 isolated controlled recommendations
//   - validates live API filters/pagination/sort semantics
//   - intentionally leaves fixtures in Atlas for browser proof
//
// Cleanup mode:
//   node .\scripts\validateOptimizationDssFiltersPaginationD5.js \
//     --cleanup <runId>
//
// This is NOT Phase 12.

import crypto from "node:crypto";
import dns from "node:dns";
import mongoose from "mongoose";
import dotenv from "dotenv";

import OptimizationDssRecommendation
    from "../models/OptimizationDssRecommendation.js";

import {
    createMongooseOptimizationDssPersistenceRepository,
} from "../services/optimizationDss/mongooseOptimizationDssPersistenceRepository.js";

import {
    persistOptimizationDssRecommendation,
} from "../services/optimizationDss/optimizationDssPersistenceService.js";

import {
    OPTIMIZATION_DSS_PERSISTENCE_RECORD_STATUS,
    OPTIMIZATION_DSS_PERSISTENCE_WRITE_MODE,
} from "../services/optimizationDss/optimizationDssPersistenceContract.js";

dotenv.config();

const CHECKPOINT =
    "POST_PHASE_11_RUNTIME_HARDENING_D5_FILTERS_PAGINATION";

const HTTP_BASE =
    (
        process.env.ASHMAAN_HTTP_BASE ||
        process.env.ASHMAAN_API_BASE_URL ||
        "http://localhost:5000"
    ).replace(/\/+$/, "");

const FIXTURE_COUNT = 27;

let assertions = 0;
let connectedHere = false;

function pass(message) {
    assertions += 1;
    console.log(`PASS ${assertions}: ${message}`);
}

function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}

function configureDns() {
    const servers =
        (
            process.env.ASHMAAN_DNS_SERVERS ||
            "1.1.1.1,8.8.8.8"
        )
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean);

    dns.setServers(servers);

    return dns.getServers();
}

async function connect() {
    const servers =
        configureDns();

    assert(
        servers.length > 0,
        "Node DNS resolver list is empty"
    );

    pass(
        `Node DNS resolver configured (${servers.join(", ")})`
    );

    const mongoUri =
        process.env.MONGODB_URI?.trim();

    assert(
        mongoUri,
        "MONGODB_URI is missing"
    );

    pass(
        "MongoDB URI is available"
    );

    if (
        mongoose.connection.readyState === 0
    ) {
        await mongoose.connect(
            mongoUri,
            {
                serverSelectionTimeoutMS: 10000,
                connectTimeoutMS: 10000,
            }
        );

        connectedHere = true;
    }

    assert(
        mongoose.connection.readyState === 1,
        "Mongoose connection is not OPEN"
    );

    pass(
        `MongoDB Atlas connection is open (${mongoose.connection.name})`
    );
}

async function getJson(url) {
    const response =
        await fetch(url, {
            method: "GET",
            headers: {
                Accept: "application/json",
            },
        });

    const text =
        await response.text();

    let payload = null;

    try {
        payload = JSON.parse(text);
    } catch {
        // Raw body retained for diagnostics.
    }

    return {
        response,
        payload,
        text,
    };
}

function extractList(payload) {
    if (Array.isArray(payload?.data)) {
        return payload.data;
    }

    if (Array.isArray(payload?.data?.items)) {
        return payload.data.items;
    }

    if (Array.isArray(payload?.data?.records)) {
        return payload.data.records;
    }

    if (Array.isArray(payload?.data?.recommendations)) {
        return payload.data.recommendations;
    }

    return null;
}

function addMinutes(iso, minutes) {
    return new Date(
        new Date(iso).getTime() +
        minutes * 60 * 1000
    ).toISOString();
}

function buildFixture({
    runId,
    index,
    vrmSiteId,
    fleetId,
    baseStart,
}) {
    const start =
        addMinutes(
            baseStart,
            index
        );

    const end =
        addMinutes(
            start,
            1
        );

    const persistenceKey =
        crypto
            .createHash("sha256")
            .update(
                `${CHECKPOINT}:${runId}:${index}`
            )
            .digest("hex");

    const actionId =
        `d5-${runId}-${index}`;

    const recommendation =
        Object.freeze({
            recommendationKind:
                "DISPATCH_SETPOINT",

            applicability:
                "APPLICABLE",

            confidence:
                "HIGH",

            advisoryOnly:
                true,

            executable:
                false,

            autoDispatch:
                false,

            actions:
                Object.freeze([
                    Object.freeze({
                        actionId,

                        recommendationKind:
                            "DISPATCH_SETPOINT",

                        target:
                            "GRID_POWER",

                        timestamp:
                            start,

                        // Explicit zero is intentional.
                        value:
                            0,

                        unit:
                            "kW",

                        advisoryOnly:
                            true,

                        executable:
                            false,

                        autoDispatch:
                            false,
                    }),
                ]),
        });

    const recommendationContract =
        Object.freeze({
            scope:
                "SITE",

            scopeIdentity:
                Object.freeze({
                    vrmSiteId,
                    fleetId,

                    // Used only to isolate D.5 fixtures
                    // and to make cleanup deterministic.
                    d5RunId:
                        runId,

                    fixtureIndex:
                        index,
                }),

            horizon:
                Object.freeze({
                    start,
                    end,
                    interval:
                        "[start,end)",
                }),

            recommendationKind:
                "DISPATCH_SETPOINT",

            applicability:
                "APPLICABLE",

            confidence:
                "HIGH",

            evidenceRefs:
                Object.freeze([
                    `post-phase-11-runtime-hardening-d5:${runId}:${index}`,
                ]),
        });

    const qualifiedResult =
        Object.freeze({
            objectiveValue:
                0,
        });

    const actionResults =
        Object.freeze([
            Object.freeze({
                actionId,

                status:
                    "GENERATED",

                value:
                    0,

                unit:
                    "kW",
            }),
        ]);

    const generationResult =
        Object.freeze({
            phase:
                "11.9",

            layer:
                "OPTIMIZATION_DSS",

            status:
                "GENERATED",

            reason:
                "GENERATED",

            recommendation,

            actionResults,

            generatedActionCount:
                1,

            unavailableActionCount:
                0,

            qualifiedResult,

            recommendationContract,

            executionResult:
                null,

            builtModel:
                null,
        });

    const persistenceRecord =
        Object.freeze({
            persistenceKey,

            recordType:
                "OPTIMIZATION_DSS_RECOMMENDATION",

            phase:
                "11.10",

            layer:
                "OPTIMIZATION_DSS",

            scope:
                "SITE",

            scopeIdentity:
                recommendationContract.scopeIdentity,

            horizon:
                recommendationContract.horizon,

            recommendationKind:
                "DISPATCH_SETPOINT",

            applicability:
                "APPLICABLE",

            confidence:
                "HIGH",

            generationStatus:
                "GENERATED",

            generationReason:
                "GENERATED",

            recommendation,

            actionResults,

            generatedActionCount:
                1,

            unavailableActionCount:
                0,

            objectiveValue:
                0,

            evidenceRefs:
                recommendationContract.evidenceRefs,

            advisoryOnly:
                true,

            executable:
                false,

            autoDispatch:
                false,
        });

    const persistenceContract =
        Object.freeze({
            phase:
                "11.10",

            layer:
                "OPTIMIZATION_DSS",

            upstreamPhase:
                "11.9",

            generationResult,

            recommendationContract,

            qualifiedResult,

            executionResult:
                null,

            builtModel:
                null,

            persistenceIdentity:
                Object.freeze({
                    recordType:
                        "OPTIMIZATION_DSS_RECOMMENDATION",

                    persistenceKey,

                    deterministic:
                        true,
                }),

            writeMode:
                OPTIMIZATION_DSS_PERSISTENCE_WRITE_MODE
                    .UPSERT_BY_PERSISTENCE_KEY,

            record:
                persistenceRecord,

            status:
                OPTIMIZATION_DSS_PERSISTENCE_RECORD_STATUS
                    .CONTRACT_DEFINED,

            persisted:
                false,

            persistenceResult:
                null,

            boundaries:
                Object.freeze({
                    automaticDispatchAllowed:
                        false,

                    executableActionProduced:
                        false,

                    missingMeansZero:
                        false,

                    unavailableMeansZero:
                        false,
                }),
        });

    return Object.freeze({
        index,
        persistenceKey,
        start,
        end,
        persistenceContract,
    });
}

async function query(params) {
    const search =
        new URLSearchParams();

    for (
        const [
            key,
            value,
        ] of Object.entries(params)
    ) {
        if (
            value !== undefined &&
            value !== null &&
            value !== ""
        ) {
            search.set(
                key,
                String(value)
            );
        }
    }

    return getJson(
        `${HTTP_BASE}/api/optimization-dss/recommendations?${search.toString()}`
    );
}

function assertOkEnvelope(
    result,
    label
) {
    assert(
        result.response.status === 200,
        `${label} returned HTTP ${result.response.status}`
    );

    assert(
        result.payload?.phase ===
        "11.12",
        `${label} phase mismatch`
    );

    assert(
        result.payload?.layer ===
        "OPTIMIZATION_DSS",
        `${label} layer mismatch`
    );

    assert(
        result.payload?.status ===
        "OK",
        `${label} status mismatch`
    );
}

async function cleanupRun(runId) {
    assert(
        typeof runId === "string" &&
        runId.startsWith("D5-"),
        "cleanup runId is invalid"
    );

    const before =
        await OptimizationDssRecommendation
            .countDocuments({
                "scopeIdentity.d5RunId":
                    runId,
            });

    const deletion =
        await OptimizationDssRecommendation
            .deleteMany({
                "scopeIdentity.d5RunId":
                    runId,
            });

    assert(
        deletion.deletedCount ===
        before,
        `cleanup expected ${before} deletions but removed ${deletion.deletedCount}`
    );

    const after =
        await OptimizationDssRecommendation
            .countDocuments({
                "scopeIdentity.d5RunId":
                    runId,
            });

    assert(
        after === 0,
        "D.5 controlled fixtures remain after cleanup"
    );

    pass(
        `controlled D.5 cleanup complete (deleted ${deletion.deletedCount})`
    );
}

console.log("");
console.log("================================================");
console.log("ASHMAAN POST-PHASE-11 RUNTIME HARDENING D.5");
console.log("================================================");
console.log(`Checkpoint: ${CHECKPOINT}`);
console.log(`HTTP base: ${HTTP_BASE}`);
console.log("");

try {
    await connect();

    const cleanupIndex =
        process.argv.indexOf(
            "--cleanup"
        );

    if (
        cleanupIndex !== -1
    ) {
        const runId =
            process.argv[
            cleanupIndex + 1
            ];

        assert(
            runId,
            "usage: node scripts\\validateOptimizationDssFiltersPaginationD5.js --cleanup <runId>"
        );

        await cleanupRun(
            runId
        );

        console.log("");
        console.log(
            `Assertions passed: ${assertions}`
        );
        console.log("================================================");
        console.log(
            "POST-PHASE-11 RUNTIME HARDENING D.5 CLEANUP PASSED"
        );
        console.log("================================================");
    } else {
        /*
         * Use a unique run identity so existing Atlas records
         * cannot interfere with the D.5 test.
         */
        const nonce =
            crypto.randomUUID();

        const runId =
            `D5-${nonce}`;

        const vrmSiteId =
            `D5-SITE-${nonce}`;

        const fleetId =
            `D5-FLEET-${nonce}`;

        /*
         * Fixed deterministic horizon.
         * 27 fixtures span exactly 27 minutes.
         */
        const baseStart =
            "2026-09-09T15:00:00.000Z";

        const fixtures =
            Array.from(
                {
                    length:
                        FIXTURE_COUNT,
                },
                (
                    _,
                    index
                ) =>
                    buildFixture({
                        runId,
                        index,
                        vrmSiteId,
                        fleetId,
                        baseStart,
                    })
            );

        const preCount =
            await OptimizationDssRecommendation
                .countDocuments({
                    "scopeIdentity.d5RunId":
                        runId,
                });

        assert(
            preCount === 0,
            "D.5 run identity already exists before persistence"
        );

        pass(
            "isolated D.5 run contains zero records before persistence"
        );

        const repository =
            createMongooseOptimizationDssPersistenceRepository({
                model:
                    OptimizationDssRecommendation,
            });

        /*
         * Persist all 27 fixtures through the REAL
         * Phase 11.11 persistence path.
         */
        for (
            const fixture of fixtures
        ) {
            const result =
                await persistOptimizationDssRecommendation({
                    persistenceContract:
                        fixture.persistenceContract,

                    repository,
                });

            if (
                result?.status !== "PERSISTED" ||
                result?.persisted !== true
            ) {
                console.error("");
                console.error(
                    `D.5 fixture ${fixture.index} persistence diagnostics:`
                );

                console.error(
                    JSON.stringify(
                        {
                            status:
                                result?.status ?? null,

                            reason:
                                result?.reason ?? null,

                            persisted:
                                result?.persisted ?? null,

                            error:
                                result?.error ?? null,

                            persistenceKey:
                                fixture.persistenceKey,

                            scopeIdentity:
                                fixture.persistenceContract
                                    ?.record
                                    ?.scopeIdentity ?? null,

                            horizon:
                                fixture.persistenceContract
                                    ?.record
                                    ?.horizon ?? null,
                        },
                        null,
                        2
                    )
                );
            }

            assert(
                result?.status === "PERSISTED" &&
                result?.persisted === true,
                `fixture ${fixture.index} failed Phase 11.11 persistence: ${result?.error?.message ??
                result?.reason ??
                "UNKNOWN_ERROR"
                }`
            );
        }

        pass(
            "all 27 controlled fixtures persist through real Phase 11.11"
        );

        const atlasCount =
            await OptimizationDssRecommendation
                .countDocuments({
                    "scopeIdentity.d5RunId":
                        runId,
                });

        assert(
            atlasCount ===
            FIXTURE_COUNT,
            `expected ${FIXTURE_COUNT} Atlas fixtures, found ${atlasCount}`
        );

        pass(
            "MongoDB Atlas contains exactly 27 controlled D.5 fixtures"
        );

        /*
         * 1. Unique site filter
         */
        const siteRead =
            await query({
                page:
                    1,
                limit:
                    100,
                vrmSiteId,
            });

        assertOkEnvelope(
            siteRead,
            "vrmSiteId filter"
        );

        const siteRecords =
            extractList(
                siteRead.payload
            );

        assert(
            Array.isArray(
                siteRecords
            ) &&
            siteRecords.length ===
            FIXTURE_COUNT,
            `vrmSiteId filter expected ${FIXTURE_COUNT} records`
        );

        assert(
            siteRead.payload?.meta?.total ===
            FIXTURE_COUNT,
            "vrmSiteId meta.total mismatch"
        );

        pass(
            "vrmSiteId filter isolates exactly 27 controlled records"
        );

        /*
         * 2. Scope filter combined with unique site identity.
         */
        const scopeRead =
            await query({
                page:
                    1,
                limit:
                    100,
                scope:
                    "SITE",
                vrmSiteId,
            });

        assertOkEnvelope(
            scopeRead,
            "scope filter"
        );

        assert(
            extractList(
                scopeRead.payload
            )?.length ===
            FIXTURE_COUNT,
            "scope+site filter did not preserve 27 records"
        );

        pass(
            "scope=SITE combines correctly with isolated site filter"
        );

        /*
         * 3. Fleet filter.
         */
        const fleetRead =
            await query({
                page:
                    1,
                limit:
                    100,
                vrmSiteId,
                fleetId,
            });

        assertOkEnvelope(
            fleetRead,
            "fleet filter"
        );

        assert(
            extractList(
                fleetRead.payload
            )?.length ===
            FIXTURE_COUNT,
            "fleetId filter mismatch"
        );

        assert(
            fleetRead.payload?.meta?.filters?.fleetId ===
            fleetId,
            "fleetId was not echoed in metadata"
        );

        pass(
            "fleetId filter combines correctly with isolated site identity"
        );

        /*
         * 4. Recommendation kind filter.
         */
        const kindRead =
            await query({
                page:
                    1,
                limit:
                    100,
                vrmSiteId,
                recommendationKind:
                    "DISPATCH_SETPOINT",
            });

        assertOkEnvelope(
            kindRead,
            "recommendationKind filter"
        );

        const kindRecords =
            extractList(
                kindRead.payload
            );

        assert(
            kindRecords?.length ===
            FIXTURE_COUNT &&
            kindRecords.every(
                (record) =>
                    record.recommendationKind ===
                    "DISPATCH_SETPOINT"
            ),
            "recommendationKind filtering failed"
        );

        pass(
            "recommendationKind filter returns only DISPATCH_SETPOINT records"
        );

        /*
         * 5. Generation status filter.
         */
        const statusRead =
            await query({
                page:
                    1,
                limit:
                    100,
                vrmSiteId,
                generationStatus:
                    "GENERATED",
            });

        assertOkEnvelope(
            statusRead,
            "generationStatus filter"
        );

        const statusRecords =
            extractList(
                statusRead.payload
            );

        assert(
            statusRecords?.length ===
            FIXTURE_COUNT &&
            statusRecords.every(
                (record) =>
                    record.generationStatus ===
                    "GENERATED"
            ),
            "generationStatus filtering failed"
        );

        pass(
            "generationStatus filter returns only GENERATED records"
        );

        /*
         * 6. Applicability filter.
         */
        const applicabilityRead =
            await query({
                page:
                    1,
                limit:
                    100,
                vrmSiteId,
                applicability:
                    "APPLICABLE",
            });

        assertOkEnvelope(
            applicabilityRead,
            "applicability filter"
        );

        const applicabilityRecords =
            extractList(
                applicabilityRead.payload
            );

        assert(
            applicabilityRecords?.length ===
            FIXTURE_COUNT &&
            applicabilityRecords.every(
                (record) =>
                    record.applicability ===
                    "APPLICABLE"
            ),
            "applicability filtering failed"
        );

        pass(
            "applicability filter returns only APPLICABLE records"
        );

        /*
         * 7. Confidence filter.
         */
        const confidenceRead =
            await query({
                page:
                    1,
                limit:
                    100,
                vrmSiteId,
                confidence:
                    "HIGH",
            });

        assertOkEnvelope(
            confidenceRead,
            "confidence filter"
        );

        const confidenceRecords =
            extractList(
                confidenceRead.payload
            );

        assert(
            confidenceRecords?.length ===
            FIXTURE_COUNT &&
            confidenceRecords.every(
                (record) =>
                    record.confidence ===
                    "HIGH"
            ),
            "confidence filtering failed"
        );

        pass(
            "confidence filter returns only HIGH-confidence records"
        );

        /*
         * 8. Fully combined filters.
         */
        const combinedRead =
            await query({
                page:
                    1,
                limit:
                    100,
                scope:
                    "SITE",
                vrmSiteId,
                fleetId,
                recommendationKind:
                    "DISPATCH_SETPOINT",
                generationStatus:
                    "GENERATED",
                applicability:
                    "APPLICABLE",
                confidence:
                    "HIGH",
            });

        assertOkEnvelope(
            combinedRead,
            "combined filters"
        );

        assert(
            extractList(
                combinedRead.payload
            )?.length ===
            FIXTURE_COUNT,
            "combined filters did not preserve exact D.5 set"
        );

        pass(
            "all non-temporal filters compose without losing controlled records"
        );

        /*
         * 9. Horizon range.
         *
         * Fixture indices:
         *   10 -> 15:10
         *   11 -> 15:11
         *   12 -> 15:12
         *   13 -> 15:13
         *   14 -> 15:14
         *
         * horizonEnd=15:15 is exclusive under repository semantics,
         * so exactly 5 records are expected.
         */
        const horizonStart =
            addMinutes(
                baseStart,
                10
            );

        const horizonEnd =
            addMinutes(
                baseStart,
                15
            );

        const horizonRead =
            await query({
                page:
                    1,
                limit:
                    100,
                vrmSiteId,
                horizonStart,
                horizonEnd,
                sortBy:
                    "horizon.start",
                sortDirection:
                    "asc",
            });

        assertOkEnvelope(
            horizonRead,
            "horizon filter"
        );

        const horizonRecords =
            extractList(
                horizonRead.payload
            );

        assert(
            horizonRecords?.length ===
            5,
            `horizon range expected 5 records, received ${horizonRecords?.length}`
        );

        assert(
            horizonRead.payload?.meta?.total ===
            5,
            "horizon-range meta.total must be 5"
        );

        pass(
            "horizonStart/horizonEnd select the expected five-record interval"
        );

        /*
         * 10. Pagination with API limit=10.
         *
         * 27 records => 3 pages:
         *   page 1 = 10
         *   page 2 = 10
         *   page 3 = 7
         */
        const page1 =
            await query({
                page:
                    1,
                limit:
                    10,
                vrmSiteId,
                sortBy:
                    "horizon.start",
                sortDirection:
                    "asc",
            });

        const page2 =
            await query({
                page:
                    2,
                limit:
                    10,
                vrmSiteId,
                sortBy:
                    "horizon.start",
                sortDirection:
                    "asc",
            });

        const page3 =
            await query({
                page:
                    3,
                limit:
                    10,
                vrmSiteId,
                sortBy:
                    "horizon.start",
                sortDirection:
                    "asc",
            });

        assertOkEnvelope(
            page1,
            "pagination page 1"
        );

        assertOkEnvelope(
            page2,
            "pagination page 2"
        );

        assertOkEnvelope(
            page3,
            "pagination page 3"
        );

        const records1 =
            extractList(
                page1.payload
            );

        const records2 =
            extractList(
                page2.payload
            );

        const records3 =
            extractList(
                page3.payload
            );

        assert(
            records1?.length ===
            10,
            "page 1 must contain 10 records"
        );

        assert(
            records2?.length ===
            10,
            "page 2 must contain 10 records"
        );

        assert(
            records3?.length ===
            7,
            "page 3 must contain 7 records"
        );

        assert(
            page1.payload?.meta?.pageCount ===
            3 &&
            page2.payload?.meta?.pageCount ===
            3 &&
            page3.payload?.meta?.pageCount ===
            3,
            "pageCount must remain 3 across all pages"
        );

        assert(
            page1.payload?.meta?.total ===
            FIXTURE_COUNT &&
            page2.payload?.meta?.total ===
            FIXTURE_COUNT &&
            page3.payload?.meta?.total ===
            FIXTURE_COUNT,
            "total must remain 27 across all pages"
        );

        pass(
            "API pagination produces exact 10/10/7 page distribution with pageCount=3"
        );

        /*
         * 11. No duplicates and no missing records.
         */
        const allPageRecords =
            [
                ...records1,
                ...records2,
                ...records3,
            ];

        const allKeys =
            allPageRecords.map(
                (record) =>
                    record.persistenceKey
            );

        assert(
            allKeys.length ===
            FIXTURE_COUNT,
            "combined page result count mismatch"
        );

        assert(
            new Set(
                allKeys
            ).size ===
            FIXTURE_COUNT,
            "duplicate persistenceKey detected across pages"
        );

        const expectedKeys =
            new Set(
                fixtures.map(
                    (fixture) =>
                        fixture.persistenceKey
                )
            );

        assert(
            allKeys.every(
                (key) =>
                    expectedKeys.has(
                        key
                    )
            ),
            "unexpected or missing fixture detected across pages"
        );

        pass(
            "pagination has no duplicate or missing controlled record"
        );

        /*
         * 12. Ascending horizon ordering.
         */
        const starts =
            allPageRecords.map(
                (record) =>
                    record.horizon?.start
            );

        const sortedStarts =
            [
                ...starts,
            ].sort();

        assert(
            starts.every(
                (
                    value,
                    index
                ) =>
                    value ===
                    sortedStarts[
                    index
                    ]
            ),
            "ascending horizon sort order is non-deterministic"
        );

        pass(
            "ascending horizon.start sort remains deterministic across page boundaries"
        );

        /*
         * 13. Descending sort.
         */
        const descending =
            await query({
                page:
                    1,
                limit:
                    10,
                vrmSiteId,
                sortBy:
                    "horizon.start",
                sortDirection:
                    "desc",
            });

        assertOkEnvelope(
            descending,
            "descending sort"
        );

        const descendingRecords =
            extractList(
                descending.payload
            );

        assert(
            descendingRecords?.[0]?.horizon?.start ===
            fixtures[
                FIXTURE_COUNT - 1
            ].start,
            "descending sort did not return latest fixture first"
        );

        pass(
            "descending horizon.start sort returns latest controlled fixture first"
        );

        /*
         * 14. Page beyond pageCount.
         */
        const beyond =
            await query({
                page:
                    4,
                limit:
                    10,
                vrmSiteId,
                sortBy:
                    "horizon.start",
                sortDirection:
                    "asc",
            });

        assertOkEnvelope(
            beyond,
            "page beyond range"
        );

        assert(
            extractList(
                beyond.payload
            )?.length ===
            0,
            "page beyond pageCount must return an empty record array"
        );

        assert(
            beyond.payload?.meta?.total ===
            FIXTURE_COUNT &&
            beyond.payload?.meta?.pageCount ===
            3,
            "page beyond range must preserve total/pageCount metadata"
        );

        pass(
            "page beyond pageCount returns empty data without corrupting metadata"
        );

        /*
         * 15. Explicit numeric zero.
         */
        assert(
            allPageRecords.every(
                (record) =>
                    record.objectiveValue ===
                    0 &&
                    record.recommendation
                        ?.actions?.[0]
                        ?.value ===
                    0
            ),
            "numeric zero was lost in paginated results"
        );

        pass(
            "explicit numeric zero survives filtering and pagination for every fixture"
        );

        /*
         * 16. Safety boundaries.
         */
        assert(
            allPageRecords.every(
                (record) =>
                    record.advisoryOnly ===
                    true &&
                    record.executable ===
                    false &&
                    record.autoDispatch ===
                    false
            ),
            "safety boundary changed during filtering/pagination"
        );

        pass(
            "all paginated records preserve advisory/non-executable/no-auto-dispatch boundary"
        );

        /*
         * 17. Filters must not mutate persistence.
         */
        const finalAtlasCount =
            await OptimizationDssRecommendation
                .countDocuments({
                    "scopeIdentity.d5RunId":
                        runId,
                });

        assert(
            finalAtlasCount ===
            FIXTURE_COUNT,
            `read-only filter/pagination calls changed Atlas fixture count to ${finalAtlasCount}`
        );

        pass(
            "filtering/pagination remain read-only and leave all 27 fixtures unchanged"
        );

        /*
         * 18. Dashboard-specific pagination.
         *
         * Dashboard uses limit=25.
         * 27 controlled records therefore must yield:
         * page 1 = 25
         * page 2 = 2
         */
        const dashboardPage1 =
            await query({
                page:
                    1,
                limit:
                    25,
                vrmSiteId,
                sortBy:
                    "createdAt",
                sortDirection:
                    "desc",
            });

        const dashboardPage2 =
            await query({
                page:
                    2,
                limit:
                    25,
                vrmSiteId,
                sortBy:
                    "createdAt",
                sortDirection:
                    "desc",
            });

        assertOkEnvelope(
            dashboardPage1,
            "dashboard page 1"
        );

        assertOkEnvelope(
            dashboardPage2,
            "dashboard page 2"
        );

        assert(
            extractList(
                dashboardPage1.payload
            )?.length ===
            25,
            "dashboard page 1 must contain 25 records"
        );

        assert(
            extractList(
                dashboardPage2.payload
            )?.length ===
            2,
            "dashboard page 2 must contain 2 records"
        );

        assert(
            dashboardPage1.payload?.meta?.pageCount ===
            2 &&
            dashboardPage2.payload?.meta?.pageCount ===
            2,
            "dashboard pageCount must equal 2"
        );

        pass(
            "dashboard limit=25 yields exact 25/2 distribution and pageCount=2"
        );

        console.log("");
        console.log(
            `Assertions passed: ${assertions}`
        );
        console.log("================================================");
        console.log(
            "POST-PHASE-11 RUNTIME HARDENING D.5 FILTERS/PAGINATION API PASSED"
        );
        console.log("================================================");
        console.log("");

        console.log(
            "IMPORTANT: 27 isolated D.5 records remain in Atlas for browser proof."
        );
        console.log("");

        console.log(
            "Browser verification input:"
        );

        console.log(
            `runId=${runId}`
        );

        console.log(
            `vrmSiteId=${vrmSiteId}`
        );

        console.log(
            `fleetId=${fleetId}`
        );

        console.log("");

        console.log(
            "Expected frontend page 1:"
        );

        console.log(
            "- TOTAL = 27"
        );

        console.log(
            "- Page 1 of 2"
        );

        console.log(
            "- NEXT enabled"
        );

        console.log(
            "- PREVIOUS disabled"
        );

        console.log(
            "- 25 recommendation rows on page 1"
        );

        console.log("");

        console.log(
            "Expected frontend page 2 after clicking NEXT:"
        );

        console.log(
            "- TOTAL = 27"
        );

        console.log(
            "- Page 2 of 2"
        );

        console.log(
            "- PREVIOUS enabled"
        );

        console.log(
            "- NEXT disabled"
        );

        console.log(
            "- exactly 2 recommendation rows on page 2"
        );

        console.log("");

        console.log(
            "Required browser filter:"
        );

        console.log(
            `VRM Site ID = ${vrmSiteId}`
        );

        console.log("");

        console.log(
            "DO NOT CLEAN UP until browser screenshots are verified."
        );

        console.log("");

        console.log(
            "Cleanup command after browser proof:"
        );

        console.log(
            `node .\\scripts\\validateOptimizationDssFiltersPaginationD5.js --cleanup ${runId}`
        );
    }
} catch (error) {
    console.error("");
    console.error("================================================");
    console.error(
        "POST-PHASE-11 RUNTIME HARDENING D.5 FAILED"
    );
    console.error("================================================");
    console.error(
        error?.stack ?? error
    );

    process.exitCode =
        1;
} finally {
    if (
        connectedHere
    ) {
        try {
            await mongoose.disconnect();
        } catch (disconnectError) {
            console.error(
                "WARN: mongoose disconnect failed:",
                disconnectError?.message ??
                disconnectError
            );
        }
    }
}