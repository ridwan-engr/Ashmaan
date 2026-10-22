import mongoose from "mongoose";

import {
    listFinancialBiKpis,
} from "../services/financialBi/financialBiApiService.js";

import {
    httpStatusForEnvelope,
} from "../controllers/financialBiController.js";

import {
    FINANCIAL_BI_COLLECTION_SCOPE_STATUS,
    FINANCIAL_BI_COLLECTION_SCOPE_REASON,
} from "../services/security/financialBiCollectionScopeService.js";


const USER_ID =
    new mongoose.Types.ObjectId()
        .toString();

const SITE_1 =
    "VRM-G4D4-001";

const SITE_2 =
    "VRM-G4D4-002";

let passCount = 0;

function assert(
    condition,
    message
) {
    if (!condition) {
        throw new Error(
            `FAIL: ${message}`
        );
    }

    passCount += 1;

    console.log(
        `PASS ${passCount}: ${message}`
    );
}


function createRepository({
    result = {
        items: [],
        total: 0,
    },
} = {}) {
    const state = {
        listCalls:
            0,

        lastListInput:
            null,
    };

    return {
        state,

        repository: {
            async listKpis(
                input
            ) {
                state.listCalls += 1;

                state.lastListInput =
                    input;

                return result;
            },

            async findByPersistenceKey() {
                return null;
            },
        },
    };
}


function resolvedScope({
    siteIds = [
        SITE_1,
        SITE_2,
    ],
} = {}) {
    return async ({
        userId,
        requestedScope,
        requestedVrmSiteId,
    }) => ({
        status:
            FINANCIAL_BI_COLLECTION_SCOPE_STATUS
                .RESOLVED,

        reason:
            requestedScope ===
                "SITE"
                ? FINANCIAL_BI_COLLECTION_SCOPE_REASON
                    .AUTHORIZED_EXPLICIT_SITE
                : FINANCIAL_BI_COLLECTION_SCOPE_REASON
                    .AUTHORIZED_SITE_COLLECTION,

        userId,

        requestedScope,

        requestedVrmSiteId,

        repositoryScope:
            "SITE",

        authorizedVrmSiteIds:
            siteIds,

        count:
            siteIds.length,
    });
}


console.log(
    "============================================================"
);

console.log(
    "P.1H-G4-D4 — FINANCIAL/BI API COLLECTION ACL VALIDATION"
);

console.log(
    "============================================================"
);


/*
|--------------------------------------------------------------------------
| 1. Authorized unfiltered collection
|--------------------------------------------------------------------------
*/

{
    const {
        repository,
        state,
    } =
        createRepository();

    let resolverInput =
        null;

    const envelope =
        await listFinancialBiKpis({
            query: {},

            userId:
                USER_ID,

            repository,

            resolveCollectionScope:
                async (
                    input
                ) => {
                    resolverInput =
                        input;

                    return resolvedScope()(
                        input
                    );
                },
        });

    assert(
        resolverInput?.userId ===
        USER_ID,
        "authenticated userId is passed to collection scope resolver"
    );

    assert(
        resolverInput
            ?.requestedScope ===
        null,
        "unfiltered collection passes null requested scope"
    );

    assert(
        resolverInput
            ?.requestedVrmSiteId ===
        null,
        "unfiltered collection passes null requested site identity"
    );

    assert(
        state.listCalls ===
        1,
        "authorized collection executes repository exactly once"
    );

    assert(
        Array.isArray(
            state.lastListInput
                ?.filters
                ?.authorizedVrmSiteIds
        ),
        "authorized site scope is injected into repository filters"
    );

    assert(
        state.lastListInput
            .filters
            .authorizedVrmSiteIds
            .length === 2 &&
        state.lastListInput
            .filters
            .authorizedVrmSiteIds[0] ===
        SITE_1 &&
        state.lastListInput
            .filters
            .authorizedVrmSiteIds[1] ===
        SITE_2,
        "repository receives exact authorized VRM site identities"
    );

    assert(
        envelope.status ===
        "OK",
        "authorized collection preserves OK response"
    );

    assert(
        envelope.meta
            ?.filters
            ?.authorizedVrmSiteIds ===
        undefined,
        "authorization site set is not exposed through public response metadata"
    );
}


/*
|--------------------------------------------------------------------------
| 2. Explicit authorized SITE
|--------------------------------------------------------------------------
*/

{
    const {
        repository,
        state,
    } =
        createRepository();

    let resolverInput =
        null;

    const envelope =
        await listFinancialBiKpis({
            query: {
                scope:
                    "SITE",

                vrmSiteId:
                    SITE_1,
            },

            userId:
                USER_ID,

            repository,

            resolveCollectionScope:
                async (
                    input
                ) => {
                    resolverInput =
                        input;

                    return resolvedScope({
                        siteIds: [
                            SITE_1,
                        ],
                    })(
                        input
                    );
                },
        });

    assert(
        resolverInput
            ?.requestedScope ===
        "SITE",
        "explicit SITE scope reaches authorization resolver"
    );

    assert(
        resolverInput
            ?.requestedVrmSiteId ===
        SITE_1,
        "explicit vrmSiteId reaches authorization resolver"
    );

    assert(
        state.listCalls ===
        1,
        "authorized explicit SITE executes repository"
    );

    assert(
        state.lastListInput
            ?.filters
            ?.vrmSiteId ===
        SITE_1,
        "public scalar SITE filter is preserved for repository intersection"
    );

    assert(
        state.lastListInput
            ?.filters
            ?.authorizedVrmSiteIds
            ?.length === 1 &&
        state.lastListInput
            .filters
            .authorizedVrmSiteIds[0] ===
        SITE_1,
        "explicit SITE repository query receives exact authorization set"
    );

    assert(
        envelope.status ===
        "OK",
        "authorized explicit SITE returns OK"
    );
}


/*
|--------------------------------------------------------------------------
| 3. EMPTY authorization
|--------------------------------------------------------------------------
*/

{
    const {
        repository,
        state,
    } =
        createRepository();

    const envelope =
        await listFinancialBiKpis({
            query: {},

            userId:
                USER_ID,

            repository,

            resolveCollectionScope:
                async () => ({
                    status:
                        FINANCIAL_BI_COLLECTION_SCOPE_STATUS
                            .EMPTY,

                    reason:
                        FINANCIAL_BI_COLLECTION_SCOPE_REASON
                            .NO_AUTHORIZED_SITES,

                    authorizedVrmSiteIds:
                        [],
                }),
        });

    assert(
        state.listCalls ===
        0,
        "EMPTY authorization performs zero repository reads"
    );

    assert(
        envelope.status ===
        "OK",
        "EMPTY authorization returns successful collection envelope"
    );

    assert(
        Array.isArray(
            envelope.data
                ?.items
        ) &&
        envelope.data.items
            .length === 0,
        "EMPTY authorization returns empty items"
    );

    assert(
        envelope.meta
            ?.total ===
        0,
        "EMPTY authorization returns total zero"
    );
}


/*
|--------------------------------------------------------------------------
| 4. FORBIDDEN authorization
|--------------------------------------------------------------------------
*/

{
    const {
        repository,
        state,
    } =
        createRepository();

    const envelope =
        await listFinancialBiKpis({
            query: {
                scope:
                    "SITE",

                vrmSiteId:
                    "VRM-NOT-AUTHORIZED",
            },

            userId:
                USER_ID,

            repository,

            resolveCollectionScope:
                async () => ({
                    status:
                        FINANCIAL_BI_COLLECTION_SCOPE_STATUS
                            .FORBIDDEN,

                    reason:
                        FINANCIAL_BI_COLLECTION_SCOPE_REASON
                            .SITE_NOT_AUTHORIZED,

                    authorizedVrmSiteIds:
                        [],
                }),
        });

    assert(
        state.listCalls ===
        0,
        "FORBIDDEN authorization performs zero repository reads"
    );

    assert(
        envelope.status ===
        "INVALID_REQUEST",
        "FORBIDDEN authorization uses controlled API response status"
    );

    assert(
        envelope.error
            ?.code ===
        "FINANCIAL_BI_ACCESS_DENIED",
        "FORBIDDEN authorization exposes stable denial code"
    );
}


/*
|--------------------------------------------------------------------------
| 5. FLEET fail closed
|--------------------------------------------------------------------------
*/

{
    const {
        repository,
        state,
    } =
        createRepository();

    const envelope =
        await listFinancialBiKpis({
            query: {
                scope:
                    "FLEET",

                fleetId:
                    "FLEET-G4D4-001",
            },

            userId:
                USER_ID,

            repository,

            resolveCollectionScope:
                async () => ({
                    status:
                        FINANCIAL_BI_COLLECTION_SCOPE_STATUS
                            .UNAVAILABLE,

                    reason:
                        FINANCIAL_BI_COLLECTION_SCOPE_REASON
                            .FLEET_AUTHORIZATION_UNAVAILABLE,

                    authorizedVrmSiteIds:
                        [],
                }),
        });

    assert(
        state.listCalls ===
        0,
        "FLEET authorization failure performs zero repository reads"
    );

    assert(
        envelope.status ===
        "UNAVAILABLE",
        "FLEET authorization fails closed as unavailable"
    );

    assert(
        envelope.error
            ?.code ===
        "FINANCIAL_BI_AUTHORIZATION_UNAVAILABLE",
        "FLEET fail-closed response uses authorization-unavailable code"
    );
}


/*
|--------------------------------------------------------------------------
| 6. Malformed authorization result
|--------------------------------------------------------------------------
*/

{
    const {
        repository,
        state,
    } =
        createRepository();

    const envelope =
        await listFinancialBiKpis({
            query: {},

            userId:
                USER_ID,

            repository,

            resolveCollectionScope:
                async () => ({
                    status:
                        "UNKNOWN",
                }),
        });

    assert(
        state.listCalls ===
        0,
        "malformed authorization result performs zero repository reads"
    );

    assert(
        envelope.status ===
        "UNAVAILABLE",
        "malformed authorization result fails closed"
    );
}


/*
|--------------------------------------------------------------------------
| 7. Authorization resolver exception
|--------------------------------------------------------------------------
*/

{
    const {
        repository,
        state,
    } =
        createRepository();

    const envelope =
        await listFinancialBiKpis({
            query: {},

            userId:
                USER_ID,

            repository,

            resolveCollectionScope:
                async () => {
                    throw new Error(
                        "SIMULATED_AUTHORIZATION_FAILURE"
                    );
                },
        });

    assert(
        state.listCalls ===
        0,
        "authorization resolver exception performs zero repository reads"
    );

    assert(
        envelope.status ===
        "UNAVAILABLE",
        "authorization resolver exception fails closed"
    );

    assert(
        envelope.error
            ?.code ===
        "FINANCIAL_BI_AUTHORIZATION_UNAVAILABLE",
        "authorization exception has explicit fail-closed code"
    );
}


/*
|--------------------------------------------------------------------------
| 8. RESOLVED with empty site set is rejected
|--------------------------------------------------------------------------
*/

{
    const {
        repository,
        state,
    } =
        createRepository();

    const envelope =
        await listFinancialBiKpis({
            query: {},

            userId:
                USER_ID,

            repository,

            resolveCollectionScope:
                async () => ({
                    status:
                        FINANCIAL_BI_COLLECTION_SCOPE_STATUS
                            .RESOLVED,

                    reason:
                        FINANCIAL_BI_COLLECTION_SCOPE_REASON
                            .AUTHORIZED_SITE_COLLECTION,

                    authorizedVrmSiteIds:
                        [],
                }),
        });

    assert(
        state.listCalls ===
        0,
        "malformed RESOLVED empty scope performs zero repository reads"
    );

    assert(
        envelope.status ===
        "UNAVAILABLE",
        "RESOLVED empty scope fails closed"
    );
}


/*
|--------------------------------------------------------------------------
| 9. Repository contract remains preserved
|--------------------------------------------------------------------------
*/

{
    const record =
    {
        _id:
            new mongoose.Types.ObjectId(),

        persistenceKey:
            "financial-bi:g4d4:001",

        recordKind:
            "KPI",

        metricName:
            "ENERGY_COST",

        scope:
            "SITE",

        scopeIdentity: {
            vrmSiteId:
                SITE_1,
        },

        reportingWindow: {
            timezone:
                "Africa/Lagos",
        },

        lineage: {},

        payload: {
            value:
                100,
        },

        phase:
            "10.10",

        upstreamPhase:
            "10.9",

        layer:
            "FINANCIAL_BI",
    };

    const {
        repository,
        state,
    } =
        createRepository({
            result: {
                items: [
                    record,
                ],

                total:
                    1,
            },
        });

    const envelope =
        await listFinancialBiKpis({
            query: {
                metricName:
                    "ENERGY_COST",
            },

            userId:
                USER_ID,

            repository,

            resolveCollectionScope:
                resolvedScope({
                    siteIds: [
                        SITE_1,
                    ],
                }),
        });

    assert(
        state.listCalls ===
        1,
        "resolved authorization preserves one repository list call"
    );

    assert(
        envelope.status ===
        "OK" &&
        envelope.data
            ?.items
            ?.length === 1,
        "authorized repository records preserve existing response normalization"
    );

    assert(
        envelope.meta
            ?.total ===
        1,
        "authorized repository result preserves total metadata"
    );

    assert(
        envelope.meta
            ?.filters
            ?.metricName ===
        "ENERGY_COST",
        "existing public query filters remain preserved"
    );
}

/*
|--------------------------------------------------------------------------
| 10. HTTP authorization mapping
|--------------------------------------------------------------------------
*/

{
    assert(
        httpStatusForEnvelope({
            status:
                "INVALID_REQUEST",

            error: {
                code:
                    "FINANCIAL_BI_ACCESS_DENIED",
            },
        }) === 403,
        "Financial/BI access denial maps to HTTP 403"
    );

    assert(
        httpStatusForEnvelope({
            status:
                "INVALID_REQUEST",

            error: {
                code:
                    "SOME_VALIDATION_ERROR",
            },
        }) === 400,
        "ordinary invalid request remains HTTP 400"
    );

    assert(
        httpStatusForEnvelope({
            status:
                "UNAVAILABLE",
        }) === 503,
        "authorization unavailable maps to HTTP 503"
    );
}


console.log();

console.log(
    "============================================================"
);

console.log(
    `P.1H-G4-D4 RESULT: PASS (${passCount}/${passCount})`
);

console.log(
    "AUTH IDENTITY: req.auth.userId"
);

console.log(
    "EMPTY ENTITLEMENT: zero repository reads"
);

console.log(
    "FORBIDDEN: zero repository reads"
);

console.log(
    "UNAVAILABLE: zero repository reads"
);

console.log(
    "RESOLVED: authorizedVrmSiteIds injected"
);

console.log(
    "PUBLIC FILTER METADATA: ACL identities not exposed"
);

console.log(
    "OPAQUE RECORD ACL: deferred"
);

console.log(
    "============================================================"
);