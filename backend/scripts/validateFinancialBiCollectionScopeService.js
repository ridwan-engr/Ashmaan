import mongoose from "mongoose";

import {
    resolveFinancialBiCollectionScope,
    FINANCIAL_BI_COLLECTION_SCOPE_STATUS,
    FINANCIAL_BI_COLLECTION_SCOPE_REASON,
} from "../services/security/financialBiCollectionScopeService.js";

import {
    USER_INSTALLATION_SCOPE_STATUS,
} from "../services/security/userInstallationScopeService.js";

const USER_ID =
    new mongoose.Types.ObjectId()
        .toString();

const INSTALLATION_1 =
    new mongoose.Types.ObjectId()
        .toString();

const INSTALLATION_2 =
    new mongoose.Types.ObjectId()
        .toString();

const SITE_1 =
    "VRM-G4D2-001";

const SITE_2 =
    "VRM-G4D2-002";

const UNAUTHORIZED_SITE =
    "VRM-G4D2-999";

let userScopeCalls = 0;
let siteScopeCalls = 0;

function resetCounters() {
    userScopeCalls = 0;
    siteScopeCalls = 0;
}

function assert(
    condition,
    message
) {
    if (!condition) {
        throw new Error(
            `FAIL: ${message}`
        );
    }

    console.log(
        `PASS ${++assert.count}: ${message}`
    );
}

assert.count = 0;

async function resolvedUserScope() {
    userScopeCalls += 1;

    return {
        status:
            USER_INSTALLATION_SCOPE_STATUS
                .RESOLVED,

        installationIds: [
            INSTALLATION_1,
            INSTALLATION_2,
        ],
    };
}

async function emptyUserScope() {
    userScopeCalls += 1;

    return {
        status:
            USER_INSTALLATION_SCOPE_STATUS
                .RESOLVED,

        installationIds: [],
    };
}

async function deniedUserScope() {
    userScopeCalls += 1;

    return {
        status:
            USER_INSTALLATION_SCOPE_STATUS
                .DENY,

        installationIds: [],
    };
}

async function unavailableUserScope() {
    userScopeCalls += 1;

    return {
        status:
            USER_INSTALLATION_SCOPE_STATUS
                .UNAVAILABLE,

        installationIds: [],
    };
}

async function throwingUserScope() {
    userScopeCalls += 1;

    throw new Error(
        "SIMULATED_USER_SCOPE_FAILURE"
    );
}

async function entitledSites({
    installationIds,
}) {
    siteScopeCalls += 1;

    assert(
        Array.isArray(
            installationIds
        ),
        "site resolver receives installationIds array"
    );

    assert(
        installationIds.length === 2,
        "site resolver receives authorized installation scope"
    );

    return [
        SITE_1,
        SITE_2,
        SITE_1,
    ];
}

async function emptySites() {
    siteScopeCalls += 1;

    return [];
}

async function throwingSites() {
    siteScopeCalls += 1;

    throw new Error(
        "SIMULATED_SITE_SCOPE_FAILURE"
    );
}

console.log(
    "============================================================"
);

console.log(
    "P.1H-G4-D2 — FINANCIAL/BI COLLECTION SCOPE VALIDATION"
);

console.log(
    "============================================================"
);

/*
|--------------------------------------------------------------------------
| 1. Unfiltered collection
|--------------------------------------------------------------------------
*/

resetCounters();

const collection =
    await resolveFinancialBiCollectionScope({
        userId:
            USER_ID,

        getUserScope:
            resolvedUserScope,

        getVrmSiteIds:
            entitledSites,
    });

assert(
    collection.status ===
        FINANCIAL_BI_COLLECTION_SCOPE_STATUS
            .RESOLVED,
    "unfiltered authorized collection resolves"
);

assert(
    collection.reason ===
        FINANCIAL_BI_COLLECTION_SCOPE_REASON
            .AUTHORIZED_SITE_COLLECTION,
    "unfiltered collection reason is explicit"
);

assert(
    collection.repositoryScope ===
        "SITE",
    "unfiltered collection is forced to SITE repository scope"
);

assert(
    collection.authorizedVrmSiteIds
        .length === 2 &&
    collection.authorizedVrmSiteIds
        .includes(SITE_1) &&
    collection.authorizedVrmSiteIds
        .includes(SITE_2),
    "unfiltered collection contains only unique authorized VRM site IDs"
);

assert(
    userScopeCalls === 1 &&
        siteScopeCalls === 1,
    "unfiltered collection resolves user and site scope exactly once"
);

/*
|--------------------------------------------------------------------------
| 2. Explicit authorized SITE
|--------------------------------------------------------------------------
*/

resetCounters();

const explicitSite =
    await resolveFinancialBiCollectionScope({
        userId:
            USER_ID,

        requestedScope:
            "SITE",

        requestedVrmSiteId:
            SITE_1,

        getUserScope:
            resolvedUserScope,

        getVrmSiteIds:
            entitledSites,
    });

assert(
    explicitSite.status ===
        FINANCIAL_BI_COLLECTION_SCOPE_STATUS
            .RESOLVED,
    "explicit authorized SITE resolves"
);

assert(
    explicitSite.reason ===
        FINANCIAL_BI_COLLECTION_SCOPE_REASON
            .AUTHORIZED_EXPLICIT_SITE,
    "explicit SITE authorization reason is explicit"
);

assert(
    explicitSite
        .authorizedVrmSiteIds
        .length === 1 &&
    explicitSite
        .authorizedVrmSiteIds[0] ===
        SITE_1,
    "explicit SITE reduces repository scope to exact authorized site"
);

/*
|--------------------------------------------------------------------------
| 3. Explicit unauthorized SITE
|--------------------------------------------------------------------------
*/

resetCounters();

const unauthorizedSite =
    await resolveFinancialBiCollectionScope({
        userId:
            USER_ID,

        requestedScope:
            "SITE",

        requestedVrmSiteId:
            UNAUTHORIZED_SITE,

        getUserScope:
            resolvedUserScope,

        getVrmSiteIds:
            entitledSites,
    });

assert(
    unauthorizedSite.status ===
        FINANCIAL_BI_COLLECTION_SCOPE_STATUS
            .FORBIDDEN,
    "explicit unauthorized SITE is forbidden"
);

assert(
    unauthorizedSite.reason ===
        FINANCIAL_BI_COLLECTION_SCOPE_REASON
            .SITE_NOT_AUTHORIZED,
    "unauthorized SITE reason is explicit"
);

/*
|--------------------------------------------------------------------------
| 4. FLEET fails before entitlement lookup
|--------------------------------------------------------------------------
*/

resetCounters();

const fleet =
    await resolveFinancialBiCollectionScope({
        userId:
            USER_ID,

        requestedScope:
            "FLEET",

        requestedVrmSiteId:
            null,

        getUserScope:
            resolvedUserScope,

        getVrmSiteIds:
            entitledSites,
    });

assert(
    fleet.status ===
        FINANCIAL_BI_COLLECTION_SCOPE_STATUS
            .UNAVAILABLE,
    "FLEET collection authorization fails closed"
);

assert(
    fleet.reason ===
        FINANCIAL_BI_COLLECTION_SCOPE_REASON
            .FLEET_AUTHORIZATION_UNAVAILABLE,
    "FLEET failure reason is explicit"
);

assert(
    userScopeCalls === 0 &&
        siteScopeCalls === 0,
    "FLEET fails before installation or site entitlement lookup"
);

/*
|--------------------------------------------------------------------------
| 5. Empty installation entitlement
|--------------------------------------------------------------------------
*/

resetCounters();

const emptyInstallationScope =
    await resolveFinancialBiCollectionScope({
        userId:
            USER_ID,

        getUserScope:
            emptyUserScope,

        getVrmSiteIds:
            entitledSites,
    });

assert(
    emptyInstallationScope.status ===
        FINANCIAL_BI_COLLECTION_SCOPE_STATUS
            .EMPTY,
    "empty installation entitlement produces EMPTY"
);

assert(
    emptyInstallationScope
        .authorizedVrmSiteIds
        .length === 0,
    "EMPTY result carries zero authorized site IDs"
);

assert(
    siteScopeCalls === 0,
    "empty installation entitlement stops before site lookup"
);

/*
|--------------------------------------------------------------------------
| 6. Installations with no entitled VRM sites
|--------------------------------------------------------------------------
*/

resetCounters();

const noVrmSites =
    await resolveFinancialBiCollectionScope({
        userId:
            USER_ID,

        getUserScope:
            resolvedUserScope,

        getVrmSiteIds:
            emptySites,
    });

assert(
    noVrmSites.status ===
        FINANCIAL_BI_COLLECTION_SCOPE_STATUS
            .EMPTY,
    "zero entitled VRM sites produces EMPTY"
);

assert(
    noVrmSites.reason ===
        FINANCIAL_BI_COLLECTION_SCOPE_REASON
            .NO_AUTHORIZED_SITES,
    "zero-site EMPTY reason is explicit"
);

/*
|--------------------------------------------------------------------------
| 7. User scope denied
|--------------------------------------------------------------------------
*/

resetCounters();

const denied =
    await resolveFinancialBiCollectionScope({
        userId:
            USER_ID,

        getUserScope:
            deniedUserScope,

        getVrmSiteIds:
            entitledSites,
    });

assert(
    denied.status ===
        FINANCIAL_BI_COLLECTION_SCOPE_STATUS
            .FORBIDDEN,
    "denied user installation scope remains forbidden"
);

assert(
    siteScopeCalls === 0,
    "denied user scope stops before site resolution"
);

/*
|--------------------------------------------------------------------------
| 8. User scope unavailable
|--------------------------------------------------------------------------
*/

resetCounters();

const unavailable =
    await resolveFinancialBiCollectionScope({
        userId:
            USER_ID,

        getUserScope:
            unavailableUserScope,

        getVrmSiteIds:
            entitledSites,
    });

assert(
    unavailable.status ===
        FINANCIAL_BI_COLLECTION_SCOPE_STATUS
            .UNAVAILABLE,
    "unavailable user installation scope fails closed"
);

assert(
    siteScopeCalls === 0,
    "unavailable user scope stops before site resolution"
);

/*
|--------------------------------------------------------------------------
| 9. User scope exception
|--------------------------------------------------------------------------
*/

resetCounters();

const userScopeFailure =
    await resolveFinancialBiCollectionScope({
        userId:
            USER_ID,

        getUserScope:
            throwingUserScope,

        getVrmSiteIds:
            entitledSites,
    });

assert(
    userScopeFailure.status ===
        FINANCIAL_BI_COLLECTION_SCOPE_STATUS
            .UNAVAILABLE,
    "user scope exception fails closed"
);

/*
|--------------------------------------------------------------------------
| 10. Site resolution exception
|--------------------------------------------------------------------------
*/

resetCounters();

const siteScopeFailure =
    await resolveFinancialBiCollectionScope({
        userId:
            USER_ID,

        getUserScope:
            resolvedUserScope,

        getVrmSiteIds:
            throwingSites,
    });

assert(
    siteScopeFailure.status ===
        FINANCIAL_BI_COLLECTION_SCOPE_STATUS
            .UNAVAILABLE,
    "VRM site scope exception fails closed"
);

assert(
    siteScopeFailure.reason ===
        FINANCIAL_BI_COLLECTION_SCOPE_REASON
            .SITE_SCOPE_RESOLUTION_FAILED,
    "VRM site scope failure reason is explicit"
);

/*
|--------------------------------------------------------------------------
| 11. Invalid user
|--------------------------------------------------------------------------
*/

resetCounters();

const invalidUser =
    await resolveFinancialBiCollectionScope({
        userId:
            "invalid-user-id",

        getUserScope:
            resolvedUserScope,

        getVrmSiteIds:
            entitledSites,
    });

assert(
    invalidUser.status ===
        FINANCIAL_BI_COLLECTION_SCOPE_STATUS
            .FORBIDDEN,
    "invalid user identity is forbidden"
);

assert(
    userScopeCalls === 0 &&
        siteScopeCalls === 0,
    "invalid user fails before entitlement lookup"
);

/*
|--------------------------------------------------------------------------
| 12. Explicit SITE without vrmSiteId
|--------------------------------------------------------------------------
*/

resetCounters();

const missingSiteIdentity =
    await resolveFinancialBiCollectionScope({
        userId:
            USER_ID,

        requestedScope:
            "SITE",

        getUserScope:
            resolvedUserScope,

        getVrmSiteIds:
            entitledSites,
    });

assert(
    missingSiteIdentity.status ===
        FINANCIAL_BI_COLLECTION_SCOPE_STATUS
            .FORBIDDEN,
    "SITE without vrmSiteId is forbidden"
);

assert(
    missingSiteIdentity.reason ===
        FINANCIAL_BI_COLLECTION_SCOPE_REASON
            .SITE_IDENTITY_REQUIRED,
    "missing SITE identity reason is explicit"
);

assert(
    userScopeCalls === 0 &&
        siteScopeCalls === 0,
    "missing SITE identity fails before entitlement lookup"
);

/*
|--------------------------------------------------------------------------
| 13. Unsupported scope
|--------------------------------------------------------------------------
*/

resetCounters();

const unsupported =
    await resolveFinancialBiCollectionScope({
        userId:
            USER_ID,

        requestedScope:
            "GLOBAL",

        getUserScope:
            resolvedUserScope,

        getVrmSiteIds:
            entitledSites,
    });

assert(
    unsupported.status ===
        FINANCIAL_BI_COLLECTION_SCOPE_STATUS
            .FORBIDDEN,
    "unsupported Financial/BI scope is forbidden"
);

assert(
    unsupported.reason ===
        FINANCIAL_BI_COLLECTION_SCOPE_REASON
            .SCOPE_UNSUPPORTED,
    "unsupported scope reason is explicit"
);

assert(
    userScopeCalls === 0 &&
        siteScopeCalls === 0,
    "unsupported scope fails before entitlement lookup"
);

console.log();

console.log(
    "============================================================"
);

console.log(
    `P.1H-G4-D2 RESULT: PASS (${assert.count}/${assert.count})`
);

console.log(
    "UNFILTERED COLLECTION: SITE-only authorized scope"
);

console.log(
    "EXPLICIT SITE: membership constrained"
);

console.log(
    "FLEET: FAIL_CLOSED"
);

console.log(
    "EMPTY ENTITLEMENT: repository execution must be skipped by next gate"
);

console.log(
    "REPOSITORY MODIFICATION: NOT PART OF G4-D2"
);

console.log(
    "============================================================"
);