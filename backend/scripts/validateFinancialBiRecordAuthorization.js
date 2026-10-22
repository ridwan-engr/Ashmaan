import mongoose from "mongoose";

import {
    authorizeFinancialBiRecord,
    FINANCIAL_BI_AUTHORIZATION_STATUS,
    FINANCIAL_BI_AUTHORIZATION_REASON,
} from "../services/security/financialBiRecordAuthorizationService.js";

const USER_ID =
    new mongoose.Types.ObjectId()
        .toString();

const INSTALLATION_ID =
    new mongoose.Types.ObjectId();

const VRM_SITE_ID =
    "VRM-SITE-G4C-001";

const FLEET_ID =
    "FLEET-G4C-001";

let installationQueries = 0;
let accessQueries = 0;

function resetCounters() {
    installationQueries = 0;
    accessQueries = 0;
}

function makeQuery(result) {
    return {
        select() {
            return this;
        },

        async lean() {
            return result;
        },
    };
}

const authorizedInstallationModel = {
    findOne(query) {
        installationQueries += 1;

        if (
            query?.source === "VRM" &&
            query?.vrmSiteId ===
                VRM_SITE_ID
        ) {
            return makeQuery({
                _id:
                    INSTALLATION_ID,
            });
        }

        return makeQuery(null);
    },
};

const authorizedAccessModel = {
    findOne(query) {
        accessQueries += 1;

        if (
            String(query?.user) ===
                USER_ID &&
            String(
                query?.installation
            ) ===
                String(
                    INSTALLATION_ID
                ) &&
            query?.active === true
        ) {
            return makeQuery({
                _id:
                    new mongoose.Types.ObjectId(),
            });
        }

        return makeQuery(null);
    },
};

const deniedAccessModel = {
    findOne() {
        accessQueries += 1;

        return makeQuery(null);
    },
};

const missingInstallationModel = {
    findOne() {
        installationQueries += 1;

        return makeQuery(null);
    },
};

const failingInstallationModel = {
    findOne() {
        installationQueries += 1;

        throw new Error(
            "SIMULATED_INSTALLATION_LOOKUP_FAILURE"
        );
    },
};

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

console.log(
    "============================================================"
);

console.log(
    "P.1H-G4-C — FINANCIAL/BI RECORD AUTHORIZATION VALIDATION"
);

console.log(
    "============================================================"
);

/*
|--------------------------------------------------------------------------
| 1. Authorized SITE
|--------------------------------------------------------------------------
*/

resetCounters();

const authorizedSite =
    await authorizeFinancialBiRecord({
        userId:
            USER_ID,

        scope:
            "SITE",

        scopeIdentity: {
            vrmSiteId:
                VRM_SITE_ID,
        },

        installationModel:
            authorizedInstallationModel,

        accessModel:
            authorizedAccessModel,
    });

assert(
    authorizedSite.authorized ===
        true,
    "authorized SITE is allowed"
);

assert(
    authorizedSite.status ===
        FINANCIAL_BI_AUTHORIZATION_STATUS
            .AUTHORIZED,
    "authorized SITE returns AUTHORIZED status"
);

assert(
    authorizedSite.reason ===
        FINANCIAL_BI_AUTHORIZATION_REASON
            .SITE_AUTHORIZED,
    "authorized SITE reason is explicit"
);

assert(
    installationQueries === 1 &&
        accessQueries === 1,
    "SITE authorization resolves Installation and UserInstallationAccess"
);

/*
|--------------------------------------------------------------------------
| 2. SITE without entitlement
|--------------------------------------------------------------------------
*/

resetCounters();

const deniedSite =
    await authorizeFinancialBiRecord({
        userId:
            USER_ID,

        scope:
            "SITE",

        scopeIdentity: {
            vrmSiteId:
                VRM_SITE_ID,
        },

        installationModel:
            authorizedInstallationModel,

        accessModel:
            deniedAccessModel,
    });

assert(
    deniedSite.authorized ===
        false,
    "SITE without UserInstallationAccess is denied"
);

assert(
    deniedSite.reason ===
        FINANCIAL_BI_AUTHORIZATION_REASON
            .SITE_NOT_AUTHORIZED,
    "unauthorized SITE reason is explicit"
);

/*
|--------------------------------------------------------------------------
| 3. Unknown SITE
|--------------------------------------------------------------------------
*/

resetCounters();

const unknownSite =
    await authorizeFinancialBiRecord({
        userId:
            USER_ID,

        scope:
            "SITE",

        scopeIdentity: {
            vrmSiteId:
                VRM_SITE_ID,
        },

        installationModel:
            missingInstallationModel,

        accessModel:
            authorizedAccessModel,
    });

assert(
    unknownSite.authorized ===
        false,
    "unknown SITE is denied"
);

assert(
    accessQueries === 0,
    "unknown SITE does not perform access lookup"
);

/*
|--------------------------------------------------------------------------
| 4. FLEET must fail closed
|--------------------------------------------------------------------------
*/

resetCounters();

const fleetDecision =
    await authorizeFinancialBiRecord({
        userId:
            USER_ID,

        scope:
            "FLEET",

        scopeIdentity: {
            fleetId:
                FLEET_ID,
        },

        installationModel:
            authorizedInstallationModel,

        accessModel:
            authorizedAccessModel,
    });

assert(
    fleetDecision.authorized ===
        false,
    "FLEET access fails closed"
);

assert(
    fleetDecision.status ===
        FINANCIAL_BI_AUTHORIZATION_STATUS
            .UNAVAILABLE,
    "FLEET authorization is explicitly unavailable"
);

assert(
    fleetDecision.reason ===
        FINANCIAL_BI_AUTHORIZATION_REASON
            .FLEET_AUTHORIZATION_UNAVAILABLE,
    "FLEET fail-closed reason is explicit"
);

assert(
    installationQueries === 0 &&
        accessQueries === 0,
    "FLEET authorization performs no Installation or access lookup"
);

/*
|--------------------------------------------------------------------------
| 5. fleetId alone must never authorize
|--------------------------------------------------------------------------
*/

assert(
    fleetDecision
        .scopeIdentity
        .fleetId ===
        FLEET_ID,
    "fleetId is preserved as domain identity without becoming authorization"
);

/*
|--------------------------------------------------------------------------
| 6. Invalid FLEET identity
|--------------------------------------------------------------------------
*/

const invalidFleet =
    await authorizeFinancialBiRecord({
        userId:
            USER_ID,

        scope:
            "FLEET",

        scopeIdentity: {},
    });

assert(
    invalidFleet.authorized ===
        false &&
        invalidFleet.reason ===
            FINANCIAL_BI_AUTHORIZATION_REASON
                .FLEET_IDENTITY_INVALID,
    "FLEET without fleetId is denied"
);

/*
|--------------------------------------------------------------------------
| 7. Invalid user
|--------------------------------------------------------------------------
*/

const invalidUser =
    await authorizeFinancialBiRecord({
        userId:
            "not-an-object-id",

        scope:
            "SITE",

        scopeIdentity: {
            vrmSiteId:
                VRM_SITE_ID,
        },

        installationModel:
            authorizedInstallationModel,

        accessModel:
            authorizedAccessModel,
    });

assert(
    invalidUser.authorized ===
        false &&
        invalidUser.reason ===
            FINANCIAL_BI_AUTHORIZATION_REASON
                .USER_ID_INVALID,
    "invalid user identity fails closed"
);

/*
|--------------------------------------------------------------------------
| 8. Invalid SITE identity
|--------------------------------------------------------------------------
*/

const invalidSite =
    await authorizeFinancialBiRecord({
        userId:
            USER_ID,

        scope:
            "SITE",

        scopeIdentity: {},
    });

assert(
    invalidSite.authorized ===
        false &&
        invalidSite.reason ===
            FINANCIAL_BI_AUTHORIZATION_REASON
                .SITE_IDENTITY_INVALID,
    "SITE without vrmSiteId is denied"
);

/*
|--------------------------------------------------------------------------
| 9. Unsupported scope
|--------------------------------------------------------------------------
*/

const unsupportedScope =
    await authorizeFinancialBiRecord({
        userId:
            USER_ID,

        scope:
            "GLOBAL",

        scopeIdentity: {},
    });

assert(
    unsupportedScope.authorized ===
        false &&
        unsupportedScope.reason ===
            FINANCIAL_BI_AUTHORIZATION_REASON
                .SCOPE_UNSUPPORTED,
    "unsupported scope fails closed"
);

/*
|--------------------------------------------------------------------------
| 10. Authorization infrastructure failure
|--------------------------------------------------------------------------
*/

const failedLookup =
    await authorizeFinancialBiRecord({
        userId:
            USER_ID,

        scope:
            "SITE",

        scopeIdentity: {
            vrmSiteId:
                VRM_SITE_ID,
        },

        installationModel:
            failingInstallationModel,

        accessModel:
            authorizedAccessModel,
    });

assert(
    failedLookup.authorized ===
        false,
    "authorization lookup failure never grants access"
);

assert(
    failedLookup.status ===
        FINANCIAL_BI_AUTHORIZATION_STATUS
            .UNAVAILABLE &&
        failedLookup.reason ===
            FINANCIAL_BI_AUTHORIZATION_REASON
                .AUTHORIZATION_LOOKUP_FAILED,
    "authorization lookup failure is explicit and fail-closed"
);

console.log();
console.log(
    "============================================================"
);

console.log(
    `P.1H-G4-C RESULT: PASS (${passCount}/${passCount})`
);

console.log(
    "SITE authorization: Installation-backed"
);

console.log(
    "FLEET authorization: FAIL_CLOSED"
);

console.log(
    "Production route/repository integration: NOT PART OF G4-C"
);

console.log(
    "============================================================"
);