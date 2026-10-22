import assert
    from "node:assert/strict";

import mongoose
    from "mongoose";

import {
    getFinancialBiKpiByPersistenceKey,
}
    from "../services/financialBi/financialBiApiService.js";

import {
    FINANCIAL_BI_AUTHORIZATION_STATUS,
    FINANCIAL_BI_AUTHORIZATION_REASON,
}
    from "../services/security/financialBiRecordAuthorizationService.js";


console.log(
    "============================================================"
);
console.log(
    "P.1H-G4-D5 — FINANCIAL/BI OPAQUE RECORD ACL VALIDATION"
);
console.log(
    "============================================================"
);


let passCount = 0;


function pass(
    message
) {
    passCount += 1;

    console.log(
        `PASS ${passCount}: ${message}`
    );
}


function check(
    condition,
    message
) {
    assert.ok(
        condition,
        message
    );

    pass(
        message
    );
}


const USER_ID =
    new mongoose.Types.ObjectId()
        .toString();

const SITE_ID =
    "vrm-site-d5-001";

const PERSISTENCE_KEY =
    "financial-bi:d5:opaque-record";


function buildRecord({
    scope = "SITE",
    scopeIdentity = {
        vrmSiteId:
            SITE_ID,
    },
} = {}) {
    return {
        _id:
            new mongoose.Types.ObjectId(),

        persistenceKey:
            PERSISTENCE_KEY,

        recordKind:
            "KPI",

        metricName:
            "ENERGY",

        scope,

        scopeIdentity,

        reportingWindow: {
            start:
                "2026-09-01T00:00:00.000Z",

            end:
                "2026-09-02T00:00:00.000Z",
        },

        lineage: {},
    };
}


function createRepository({
    record =
        buildRecord(),
} = {}) {
    const state = {
        listCalls: 0,
        findCalls: 0,
        persistenceKey: null,
    };

    return {
        state,

        repository: {
            async listKpis() {
                state.listCalls += 1;

                throw new Error(
                    "LIST_MUST_NOT_EXECUTE"
                );
            },

            async findByPersistenceKey({
                persistenceKey,
            } = {}) {
                state.findCalls += 1;
                state.persistenceKey =
                    persistenceKey;

                return record;
            },
        },
    };
}


/*
|--------------------------------------------------------------------------
| 1. Authorized SITE record
|--------------------------------------------------------------------------
*/

{
    const record =
        buildRecord();

    const {
        repository,
        state,
    } =
        createRepository({
            record,
        });

    let received = null;

    const envelope =
        await getFinancialBiKpiByPersistenceKey({
            persistenceKey:
                PERSISTENCE_KEY,

            userId:
                USER_ID,

            repository,

            authorizeRecord:
                async (input) => {
                    received =
                        input;

                    return {
                        authorized:
                            true,

                        status:
                            FINANCIAL_BI_AUTHORIZATION_STATUS
                                .AUTHORIZED,

                        reason:
                            FINANCIAL_BI_AUTHORIZATION_REASON
                                .SITE_AUTHORIZED,
                    };
                },
        });

    check(
        state.findCalls === 1,
        "opaque record executes exactly one persistence-key lookup"
    );

    check(
        state.persistenceKey ===
            PERSISTENCE_KEY,
        "repository receives exact persistence key"
    );

    check(
        received?.userId ===
            USER_ID,
        "authenticated userId reaches record authorizer"
    );

    check(
        received?.scope ===
            "SITE",
        "record scope reaches record authorizer"
    );

    check(
        received?.scopeIdentity
            ?.vrmSiteId ===
            SITE_ID,
        "record SITE identity reaches record authorizer"
    );

    check(
        envelope.status ===
            "OK",
        "authorized SITE record returns OK"
    );

    check(
        envelope.data
            ?.persistenceKey ===
            PERSISTENCE_KEY,
        "authorized record preserves existing normalization"
    );

    check(
        state.listCalls === 0,
        "opaque record path never executes collection repository"
    );
}


/*
|--------------------------------------------------------------------------
| 2. FORBIDDEN record
|--------------------------------------------------------------------------
*/

{
    const {
        repository,
        state,
    } =
        createRepository();

    const envelope =
        await getFinancialBiKpiByPersistenceKey({
            persistenceKey:
                PERSISTENCE_KEY,

            userId:
                USER_ID,

            repository,

            authorizeRecord:
                async () => ({
                    authorized:
                        false,

                    status:
                        FINANCIAL_BI_AUTHORIZATION_STATUS
                            .FORBIDDEN,

                    reason:
                        FINANCIAL_BI_AUTHORIZATION_REASON
                            .SITE_NOT_AUTHORIZED,
                }),
        });

    check(
        state.findCalls === 1,
        "FORBIDDEN opaque record performs only required identity lookup"
    );

    check(
        envelope.status ===
            "INVALID_REQUEST",
        "FORBIDDEN record uses controlled API response status"
    );

    check(
        envelope.error
            ?.code ===
            "FINANCIAL_BI_ACCESS_DENIED",
        "FORBIDDEN record exposes stable access-denied code"
    );

    check(
        envelope.data ===
            null ||
        envelope.data ===
            undefined,
        "FORBIDDEN record does not disclose record data"
    );
}


/*
|--------------------------------------------------------------------------
| 3. UNAVAILABLE
|--------------------------------------------------------------------------
*/

{
    const {
        repository,
    } =
        createRepository();

    const envelope =
        await getFinancialBiKpiByPersistenceKey({
            persistenceKey:
                PERSISTENCE_KEY,

            userId:
                USER_ID,

            repository,

            authorizeRecord:
                async () => ({
                    authorized:
                        false,

                    status:
                        FINANCIAL_BI_AUTHORIZATION_STATUS
                            .UNAVAILABLE,

                    reason:
                        FINANCIAL_BI_AUTHORIZATION_REASON
                            .AUTHORIZATION_LOOKUP_FAILED,
                }),
        });

    check(
        envelope.status ===
            "UNAVAILABLE",
        "authorization unavailable fails closed"
    );

    check(
        envelope.error
            ?.code ===
            "FINANCIAL_BI_AUTHORIZATION_UNAVAILABLE",
        "authorization unavailable exposes stable fail-closed code"
    );

    check(
        envelope.data ===
            null ||
        envelope.data ===
            undefined,
        "authorization unavailable does not disclose record data"
    );
}


/*
|--------------------------------------------------------------------------
| 4. Authorizer exception
|--------------------------------------------------------------------------
*/

{
    const {
        repository,
    } =
        createRepository();

    const envelope =
        await getFinancialBiKpiByPersistenceKey({
            persistenceKey:
                PERSISTENCE_KEY,

            userId:
                USER_ID,

            repository,

            authorizeRecord:
                async () => {
                    throw new Error(
                        "AUTHORIZATION_FAILURE"
                    );
                },
        });

    check(
        envelope.status ===
            "UNAVAILABLE",
        "record authorization exception fails closed"
    );

    check(
        envelope.error
            ?.code ===
            "FINANCIAL_BI_AUTHORIZATION_UNAVAILABLE",
        "record authorization exception has explicit fail-closed code"
    );
}


/*
|--------------------------------------------------------------------------
| 5. Malformed authorization result
|--------------------------------------------------------------------------
*/

{
    const {
        repository,
    } =
        createRepository();

    const envelope =
        await getFinancialBiKpiByPersistenceKey({
            persistenceKey:
                PERSISTENCE_KEY,

            userId:
                USER_ID,

            repository,

            authorizeRecord:
                async () => ({
                    authorized:
                        false,

                    status:
                        "UNKNOWN",
                }),
        });

    check(
        envelope.status ===
            "UNAVAILABLE",
        "malformed authorization result fails closed"
    );

    check(
        envelope.data ===
            null ||
        envelope.data ===
            undefined,
        "malformed authorization result cannot disclose record"
    );
}


/*
|--------------------------------------------------------------------------
| 6. AUTHORIZED status without authorized=true
|--------------------------------------------------------------------------
*/

{
    const {
        repository,
    } =
        createRepository();

    const envelope =
        await getFinancialBiKpiByPersistenceKey({
            persistenceKey:
                PERSISTENCE_KEY,

            userId:
                USER_ID,

            repository,

            authorizeRecord:
                async () => ({
                    authorized:
                        false,

                    status:
                        FINANCIAL_BI_AUTHORIZATION_STATUS
                            .AUTHORIZED,
                }),
        });

    check(
        envelope.status ===
            "UNAVAILABLE",
        "AUTHORIZED status without authorized=true fails closed"
    );

    check(
        envelope.data ===
            null ||
        envelope.data ===
            undefined,
        "inconsistent authorization result cannot disclose record"
    );
}


/*
|--------------------------------------------------------------------------
| 7. FLEET record
|--------------------------------------------------------------------------
*/

{
    const fleetRecord =
        buildRecord({
            scope:
                "FLEET",

            scopeIdentity: {
                fleetId:
                    "fleet-d5-001",
            },
        });

    const {
        repository,
    } =
        createRepository({
            record:
                fleetRecord,
        });

    let received = null;

    const envelope =
        await getFinancialBiKpiByPersistenceKey({
            persistenceKey:
                PERSISTENCE_KEY,

            userId:
                USER_ID,

            repository,

            authorizeRecord:
                async (input) => {
                    received =
                        input;

                    return {
                        authorized:
                            false,

                        status:
                            FINANCIAL_BI_AUTHORIZATION_STATUS
                                .UNAVAILABLE,

                        reason:
                            FINANCIAL_BI_AUTHORIZATION_REASON
                                .FLEET_AUTHORIZATION_UNAVAILABLE,
                    };
                },
        });

    check(
        received?.scope ===
            "FLEET",
        "FLEET record scope reaches record authorizer"
    );

    check(
        received?.scopeIdentity
            ?.fleetId ===
            "fleet-d5-001",
        "FLEET identity reaches record authorizer"
    );

    check(
        envelope.status ===
            "UNAVAILABLE",
        "FLEET opaque record fails closed"
    );

    check(
        envelope.data ===
            null ||
        envelope.data ===
            undefined,
        "FLEET fail-closed response does not disclose record"
    );
}


/*
|--------------------------------------------------------------------------
| 8. Missing record
|--------------------------------------------------------------------------
*/

{
    const {
        repository,
        state,
    } =
        createRepository({
            record:
                null,
        });

    let authorizationCalls = 0;

    const envelope =
        await getFinancialBiKpiByPersistenceKey({
            persistenceKey:
                PERSISTENCE_KEY,

            userId:
                USER_ID,

            repository,

            authorizeRecord:
                async () => {
                    authorizationCalls += 1;

                    throw new Error(
                        "MUST_NOT_EXECUTE"
                    );
                },
        });

    check(
        state.findCalls === 1,
        "missing opaque record performs exactly one repository lookup"
    );

    check(
        authorizationCalls === 0,
        "missing record performs zero authorization lookups"
    );

    check(
        envelope.status ===
            "NOT_FOUND",
        "missing record preserves NOT_FOUND semantics"
    );

    check(
        envelope.error
            ?.code ===
            "FINANCIAL_BI_KPI_NOT_FOUND",
        "missing record preserves existing not-found code"
    );
}


console.log("");
console.log(
    "============================================================"
);
console.log(
    `P.1H-G4-D5 RESULT: PASS (${passCount}/${passCount})`
);
console.log(
    "OPAQUE LOOKUP: exactly one persistence-key repository read"
);
console.log(
    "SITE RECORD: authorization required before disclosure"
);
console.log(
    "FORBIDDEN: no record disclosure"
);
console.log(
    "UNAVAILABLE: fail closed"
);
console.log(
    "FLEET: fail closed"
);
console.log(
    "MALFORMED AUTHORIZATION: fail closed"
);
console.log(
    "NOT_FOUND: existing semantics preserved"
);
console.log(
    "============================================================"
);