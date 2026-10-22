import {
    buildMongoFilter,
} from "../services/financialBi/mongooseFinancialBiReadRepository.js";

let passCount = 0;

function pass(message) {
    passCount += 1;

    console.log(
        `PASS ${passCount}: ${message}`
    );
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

    pass(message);
}

function assertArrayEqual(
    actual,
    expected,
    message
) {
    assert(
        Array.isArray(actual) &&
        actual.length ===
            expected.length &&
        actual.every(
            (value, index) =>
                value ===
                expected[index]
        ),
        message
    );
}

console.log(
    "============================================================"
);

console.log(
    "P.1H-G4-D3 — FINANCIAL/BI REPOSITORY ACL VALIDATION"
);

console.log(
    "============================================================"
);

/*
|--------------------------------------------------------------------------
| 1. Existing scalar SITE behavior remains intact
|--------------------------------------------------------------------------
*/

const legacySite =
    buildMongoFilter({
        scope:
            "SITE",

        vrmSiteId:
            "SITE-001",
    });

assert(
    legacySite.scope ===
        "SITE",
    "legacy SITE scope is preserved"
);

assert(
    legacySite[
        "scopeIdentity.vrmSiteId"
    ] ===
        "SITE-001",
    "legacy scalar vrmSiteId behavior is preserved"
);

/*
|--------------------------------------------------------------------------
| 2. Existing FLEET domain behavior remains intact without ACL input
|--------------------------------------------------------------------------
*/

const legacyFleet =
    buildMongoFilter({
        scope:
            "FLEET",

        fleetId:
            "FLEET-001",
    });

assert(
    legacyFleet.scope ===
        "FLEET",
    "legacy FLEET domain scope remains supported"
);

assert(
    legacyFleet[
        "scopeIdentity.fleetId"
    ] ===
        "FLEET-001",
    "legacy fleetId persistence filter remains supported"
);

/*
|--------------------------------------------------------------------------
| 3. Authorized multi-site collection
|--------------------------------------------------------------------------
*/

const authorizedCollection =
    buildMongoFilter({
        authorizedVrmSiteIds: [
            "SITE-001",
            "SITE-002",
        ],
    });

assert(
    authorizedCollection.scope ===
        "SITE",
    "authorized multi-site collection is forced to SITE scope"
);

assertArrayEqual(
    authorizedCollection[
        "scopeIdentity.vrmSiteId"
    ]?.$in,
    [
        "SITE-001",
        "SITE-002",
    ],
    "authorized multi-site collection uses Mongo $in"
);

/*
|--------------------------------------------------------------------------
| 4. Duplicate/whitespace site identities normalize safely
|--------------------------------------------------------------------------
*/

const normalizedCollection =
    buildMongoFilter({
        authorizedVrmSiteIds: [
            " SITE-001 ",
            "SITE-002",
            "SITE-001",
            "",
            "   ",
        ],
    });

assertArrayEqual(
    normalizedCollection[
        "scopeIdentity.vrmSiteId"
    ]?.$in,
    [
        "SITE-001",
        "SITE-002",
    ],
    "authorized site IDs are normalized and deduplicated"
);

/*
|--------------------------------------------------------------------------
| 5. Empty authorized scope matches nothing
|--------------------------------------------------------------------------
*/

const emptyScope =
    buildMongoFilter({
        authorizedVrmSiteIds:
            [],
    });

assert(
    emptyScope.scope ===
        "SITE",
    "empty authorization scope remains SITE constrained"
);

assert(
    Array.isArray(
        emptyScope[
            "scopeIdentity.vrmSiteId"
        ]?.$in
    ) &&
    emptyScope[
        "scopeIdentity.vrmSiteId"
    ].$in.length === 0,
    "empty authorization scope becomes $in: []"
);

/*
|--------------------------------------------------------------------------
| 6. Explicit authorized scalar SITE
|--------------------------------------------------------------------------
*/

const authorizedExplicitSite =
    buildMongoFilter({
        scope:
            "SITE",

        vrmSiteId:
            "SITE-001",

        authorizedVrmSiteIds: [
            "SITE-001",
            "SITE-002",
        ],
    });

assert(
    authorizedExplicitSite.scope ===
        "SITE",
    "authorized explicit SITE remains SITE constrained"
);

assert(
    authorizedExplicitSite[
        "scopeIdentity.vrmSiteId"
    ] ===
        "SITE-001",
    "authorized scalar SITE intersects successfully with ACL"
);

/*
|--------------------------------------------------------------------------
| 7. Explicit unauthorized scalar SITE
|--------------------------------------------------------------------------
*/

const unauthorizedExplicitSite =
    buildMongoFilter({
        scope:
            "SITE",

        vrmSiteId:
            "SITE-999",

        authorizedVrmSiteIds: [
            "SITE-001",
            "SITE-002",
        ],
    });

assert(
    unauthorizedExplicitSite.scope ===
        "SITE",
    "unauthorized scalar SITE cannot escape SITE scope"
);

assert(
    Array.isArray(
        unauthorizedExplicitSite[
            "scopeIdentity.vrmSiteId"
        ]?.$in
    ) &&
    unauthorizedExplicitSite[
        "scopeIdentity.vrmSiteId"
    ].$in.length === 0,
    "unauthorized scalar SITE becomes an impossible match"
);

/*
|--------------------------------------------------------------------------
| 8. Caller FLEET cannot override ACL SITE scope
|--------------------------------------------------------------------------
*/

const attemptedFleetOverride =
    buildMongoFilter({
        scope:
            "FLEET",

        fleetId:
            "FLEET-001",

        authorizedVrmSiteIds: [
            "SITE-001",
            "SITE-002",
        ],
    });

assert(
    attemptedFleetOverride.scope ===
        "SITE",
    "ACL scope overrides attempted FLEET scope"
);

assert(
    !Object.prototype.hasOwnProperty.call(
        attemptedFleetOverride,
        "scopeIdentity.fleetId"
    ),
    "fleetId is not applied while authorization site scope is active"
);

assertArrayEqual(
    attemptedFleetOverride[
        "scopeIdentity.vrmSiteId"
    ]?.$in,
    [
        "SITE-001",
        "SITE-002",
    ],
    "attempted FLEET override remains restricted to authorized SITE identities"
);

/*
|--------------------------------------------------------------------------
| 9. Scalar vrmSiteId cannot replace ACL scope
|--------------------------------------------------------------------------
*/

const scalarCannotBroaden =
    buildMongoFilter({
        vrmSiteId:
            "SITE-999",

        authorizedVrmSiteIds: [
            "SITE-001",
        ],
    });

assert(
    Array.isArray(
        scalarCannotBroaden[
            "scopeIdentity.vrmSiteId"
        ]?.$in
    ) &&
    scalarCannotBroaden[
        "scopeIdentity.vrmSiteId"
    ].$in.length === 0,
    "unauthorized scalar filter cannot replace authorization constraint"
);

/*
|--------------------------------------------------------------------------
| 10. Non-security filters remain preserved
|--------------------------------------------------------------------------
*/

const reportingStart =
    new Date(
        "2026-01-01T00:00:00.000Z"
    );

const reportingEnd =
    new Date(
        "2026-02-01T00:00:00.000Z"
    );

const preservedFilters =
    buildMongoFilter({
        authorizedVrmSiteIds: [
            "SITE-001",
        ],

        metricName:
            "ENERGY_COST",

        timezone:
            "Africa/Lagos",

        reportingStart,

        reportingEnd,
    });

assert(
    preservedFilters.metricName ===
        "ENERGY_COST",
    "metricName filter remains preserved"
);

assert(
    preservedFilters[
        "reportingWindow.timezone"
    ] ===
        "Africa/Lagos",
    "timezone filter remains preserved"
);

assert(
    preservedFilters[
        "reportingWindow.start"
    ]?.$gte ===
        reportingStart &&
    preservedFilters[
        "reportingWindow.start"
    ]?.$lt ===
        reportingEnd,
    "reporting window filters remain preserved"
);

assert(
    preservedFilters[
        "reportingWindow.semantics"
    ] ===
        "[start,end)",
    "reporting window semantics remain preserved"
);

/*
|--------------------------------------------------------------------------
| 11. Missing authorization property preserves legacy behavior
|--------------------------------------------------------------------------
*/

const noAuthorizationProperty =
    buildMongoFilter({
        metricName:
            "ENERGY_COST",
    });

assert(
    !Object.prototype.hasOwnProperty.call(
        noAuthorizationProperty,
        "scope"
    ),
    "absence of ACL property does not invent SITE scope for legacy callers"
);

assert(
    !Object.prototype.hasOwnProperty.call(
        noAuthorizationProperty,
        "scopeIdentity.vrmSiteId"
    ),
    "absence of ACL property preserves legacy identity behavior"
);

/*
|--------------------------------------------------------------------------
| 12. Undefined authorization property behaves as absent
|--------------------------------------------------------------------------
*/

const undefinedAuthorization =
    buildMongoFilter({
        scope:
            "SITE",

        vrmSiteId:
            "SITE-001",

        authorizedVrmSiteIds:
            undefined,
    });

assert(
    undefinedAuthorization[
        "scopeIdentity.vrmSiteId"
    ] ===
        "SITE-001",
    "undefined ACL property preserves scalar legacy behavior"
);

console.log();

console.log(
    "============================================================"
);

console.log(
    `P.1H-G4-D3 RESULT: PASS (${passCount}/${passCount})`
);

console.log(
    "AUTHORIZED COLLECTION: Mongo $in enforcement"
);

console.log(
    "EMPTY AUTHORIZATION: $in [] / match nothing"
);

console.log(
    "EXPLICIT SITE: ACL intersection enforced"
);

console.log(
    "FLEET DOMAIN SUPPORT: preserved without ACL"
);

console.log(
    "FLEET ACL OVERRIDE: impossible"
);

console.log(
    "API SERVICE INTEGRATION: NOT PART OF G4-D3"
);

console.log(
    "============================================================"
);