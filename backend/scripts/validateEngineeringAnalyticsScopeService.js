import assert from "node:assert/strict";
import mongoose from "mongoose";

import {
    ENGINEERING_ANALYTICS_SCOPE_STATUS,
    getEngineeringAnalyticsInstallationScope,
} from "../services/security/engineeringAnalyticsScopeService.js";

import {
    USER_INSTALLATION_SCOPE_STATUS,
} from "../services/security/userInstallationScopeService.js";


let assertions = 0;

function equal(actual, expected, message) {
    assert.equal(actual, expected);
    assertions += 1;
    console.log(`PASS ${assertions}: ${message}`);
}

function ok(value, message) {
    assert.ok(value);
    assertions += 1;
    console.log(`PASS ${assertions}: ${message}`);
}


const userId =
    new mongoose.Types.ObjectId().toString();

const installationIdA =
    new mongoose.Types.ObjectId().toString();

const installationIdB =
    new mongoose.Types.ObjectId().toString();


function createModel({
    records = [],
    error = null,
} = {}) {
    return {
        find(filter) {
            createModel.lastFilter =
                filter;

            return {
                select(selection) {
                    createModel.lastSelection =
                        selection;

                    return {
                        async lean() {
                            if (error) {
                                throw error;
                            }

                            return records;
                        },
                    };
                },
            };
        },
    };
}


/*
|--------------------------------------------------------------------------
| Controlled statuses
|--------------------------------------------------------------------------
*/

equal(
    ENGINEERING_ANALYTICS_SCOPE_STATUS.RESOLVED,
    "RESOLVED",
    "RESOLVED status is controlled"
);

equal(
    ENGINEERING_ANALYTICS_SCOPE_STATUS.DENY,
    "DENY",
    "DENY status is controlled"
);

equal(
    ENGINEERING_ANALYTICS_SCOPE_STATUS.UNAVAILABLE,
    "UNAVAILABLE",
    "UNAVAILABLE status is controlled"
);


/*
|--------------------------------------------------------------------------
| Invalid user
|--------------------------------------------------------------------------
*/

{
    let resolverCalled = false;

    const result =
        await getEngineeringAnalyticsInstallationScope({
            userId: "invalid",

            resolveUserScope:
                async () => {
                    resolverCalled = true;
                    return null;
                },

            installationModel:
                createModel(),
        });

    equal(
        result.status,
        ENGINEERING_ANALYTICS_SCOPE_STATUS.DENY,
        "invalid user fails closed"
    );

    equal(
        result.allowed,
        false,
        "invalid user is not allowed"
    );

    equal(
        resolverCalled,
        false,
        "invalid user does not query entitlement scope"
    );
}


/*
|--------------------------------------------------------------------------
| Explicit entitlement DENY
|--------------------------------------------------------------------------
*/

{
    const result =
        await getEngineeringAnalyticsInstallationScope({
            userId,

            resolveUserScope:
                async () => ({
                    status:
                        USER_INSTALLATION_SCOPE_STATUS.DENY,

                    installationIds: [],
                }),

            installationModel:
                createModel(),
        });

    equal(
        result.status,
        ENGINEERING_ANALYTICS_SCOPE_STATUS.DENY,
        "entitlement DENY is preserved"
    );

    equal(
        result.allowed,
        false,
        "DENY never grants Engineering access"
    );
}


/*
|--------------------------------------------------------------------------
| Resolver failure
|--------------------------------------------------------------------------
*/

{
    const result =
        await getEngineeringAnalyticsInstallationScope({
            userId,

            resolveUserScope:
                async () => {
                    throw new Error(
                        "scope unavailable"
                    );
                },

            installationModel:
                createModel(),
        });

    equal(
        result.status,
        ENGINEERING_ANALYTICS_SCOPE_STATUS.UNAVAILABLE,
        "entitlement resolver failure becomes UNAVAILABLE"
    );

    equal(
        result.allowed,
        false,
        "UNAVAILABLE does not grant access"
    );
}


/*
|--------------------------------------------------------------------------
| Empty entitlement
|--------------------------------------------------------------------------
*/

{
    let repositoryCalled = false;

    const result =
        await getEngineeringAnalyticsInstallationScope({
            userId,

            resolveUserScope:
                async () => ({
                    status:
                        USER_INSTALLATION_SCOPE_STATUS.RESOLVED,

                    installationIds: [],
                }),

            installationModel: {
                find() {
                    repositoryCalled = true;
                    throw new Error(
                        "must not query"
                    );
                },
            },
        });

    equal(
        result.status,
        ENGINEERING_ANALYTICS_SCOPE_STATUS.RESOLVED,
        "empty entitlement is resolved"
    );

    equal(
        result.allowed,
        true,
        "empty entitlement is a valid empty authorization scope"
    );

    equal(
        result.installations.length,
        0,
        "empty entitlement exposes zero installations"
    );

    equal(
        result.vrmSiteIds.length,
        0,
        "empty entitlement exposes zero VRM sites"
    );

    equal(
        repositoryCalled,
        false,
        "empty entitlement never becomes unrestricted query"
    );
}


/*
|--------------------------------------------------------------------------
| Successful entitlement resolution
|--------------------------------------------------------------------------
*/

{
    const model =
        createModel({
            records: [
                {
                    _id: installationIdA,
                    vrmSiteId: "18053",
                },
                {
                    _id: installationIdB,
                    vrmSiteId: "18054",
                },
            ],
        });

    const result =
        await getEngineeringAnalyticsInstallationScope({
            userId,

            resolveUserScope:
                async () => ({
                    status:
                        USER_INSTALLATION_SCOPE_STATUS.RESOLVED,

                    installationIds: [
                        installationIdA,
                        installationIdB,
                    ],
                }),

            installationModel:
                model,
        });

    equal(
        result.status,
        ENGINEERING_ANALYTICS_SCOPE_STATUS.RESOLVED,
        "valid entitlement resolves"
    );

    equal(
        result.allowed,
        true,
        "resolved scope is allowed"
    );

    equal(
        result.installations.length,
        2,
        "exact entitled Installation population is returned"
    );

    equal(
        result.vrmSiteIds.length,
        2,
        "exact VRM site population is returned"
    );

    equal(
        result.vrmSiteIds[0],
        "18053",
        "first VRM site identity is preserved"
    );

    equal(
        result.vrmSiteIds[1],
        "18054",
        "second VRM site identity is preserved"
    );

    equal(
        createModel.lastFilter.source,
        "VRM",
        "Installation query is restricted to VRM source"
    );

    ok(
        Array.isArray(
            createModel.lastFilter._id.$in
        ),
        "Installation query uses explicit entitlement id set"
    );

    equal(
        createModel.lastFilter._id.$in.length,
        2,
        "Installation query contains exactly two entitlement ids"
    );

    equal(
        createModel.lastSelection,
        "_id vrmSiteId",
        "query selects only authorization identity fields"
    );

    equal(
        Object.isFrozen(result),
        true,
        "scope result is frozen"
    );

    equal(
        Object.isFrozen(
            result.installations
        ),
        true,
        "installation scope is frozen"
    );

    equal(
        Object.isFrozen(
            result.vrmSiteIds
        ),
        true,
        "VRM site scope is frozen"
    );

    equal(
        result.equipmentControlAllowed,
        false,
        "scope cannot enable equipment control"
    );

    equal(
        result.automaticDispatchAllowed,
        false,
        "scope cannot enable automatic dispatch"
    );
}


/*
|--------------------------------------------------------------------------
| Incomplete entitlement resolution
|--------------------------------------------------------------------------
*/

{
    const result =
        await getEngineeringAnalyticsInstallationScope({
            userId,

            resolveUserScope:
                async () => ({
                    status:
                        USER_INSTALLATION_SCOPE_STATUS.RESOLVED,

                    installationIds: [
                        installationIdA,
                        installationIdB,
                    ],
                }),

            installationModel:
                createModel({
                    records: [
                        {
                            _id:
                                installationIdA,

                            vrmSiteId:
                                "18053",
                        },
                    ],
                }),
        });

    equal(
        result.status,
        ENGINEERING_ANALYTICS_SCOPE_STATUS.UNAVAILABLE,
        "missing entitled Installation fails closed"
    );

    equal(
        result.allowed,
        false,
        "partial entitlement resolution is never authorized"
    );
}


/*
|--------------------------------------------------------------------------
| Missing external site identity
|--------------------------------------------------------------------------
*/

{
    const result =
        await getEngineeringAnalyticsInstallationScope({
            userId,

            resolveUserScope:
                async () => ({
                    status:
                        USER_INSTALLATION_SCOPE_STATUS.RESOLVED,

                    installationIds: [
                        installationIdA,
                    ],
                }),

            installationModel:
                createModel({
                    records: [
                        {
                            _id:
                                installationIdA,

                            vrmSiteId:
                                null,
                        },
                    ],
                }),
        });

    equal(
        result.status,
        ENGINEERING_ANALYTICS_SCOPE_STATUS.UNAVAILABLE,
        "missing vrmSiteId fails closed"
    );

    equal(
        result.allowed,
        false,
        "missing vrmSiteId cannot become authorized"
    );
}


/*
|--------------------------------------------------------------------------
| Repository failure
|--------------------------------------------------------------------------
*/

{
    const result =
        await getEngineeringAnalyticsInstallationScope({
            userId,

            resolveUserScope:
                async () => ({
                    status:
                        USER_INSTALLATION_SCOPE_STATUS.RESOLVED,

                    installationIds: [
                        installationIdA,
                    ],
                }),

            installationModel:
                createModel({
                    error:
                        new Error(
                            "repository unavailable"
                        ),
                }),
        });

    equal(
        result.status,
        ENGINEERING_ANALYTICS_SCOPE_STATUS.UNAVAILABLE,
        "Installation repository failure becomes UNAVAILABLE"
    );

    equal(
        result.allowed,
        false,
        "repository failure cannot grant access"
    );
}


console.log("");
console.log(
    `Assertions passed: ${assertions}`
);
console.log(
    "================================================"
);
console.log(
    "P.1H-G2-D2-B ENGINEERING ANALYTICS SCOPE SERVICE PASSED"
);
console.log(
    "================================================"
);
