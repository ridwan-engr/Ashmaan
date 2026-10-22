import assert from "node:assert/strict";

import {
    FORECAST_RECORD_AUTHORIZATION_DECISIONS,
    FORECAST_RECORD_AUTHORIZATION_REASONS,
    readForecastIdentityVrmSiteId,
    authorizeForecastRecord,
} from "../services/security/forecastRecordAuthorizationService.js";

import {
    INSTALLATION_RESOURCE_RESOLUTION,
} from "../services/security/installationResourceResolver.js";

import {
    SITE_RESOURCE_AUTHORIZATION_DECISIONS,
} from "../services/security/siteResourceAuthorizationService.js";


let passed =
    0;


function pass(
    message
) {
    passed +=
        1;

    console.log(
        `PASS ${passed}: ${message}`
    );
}


const installationId =
    "507f191e810c19729de860ea";

const userId =
    "507f1f77bcf86cd799439011";


function resolvedInstallation({
    vrmSiteId =
        "18053",
} = {}) {
    return {
        status:
            INSTALLATION_RESOURCE_RESOLUTION.RESOLVED,

        resolved:
            true,

        vrmSiteId,

        installationId,
    };
}


function allowAuthorization() {
    return {
        decision:
            SITE_RESOURCE_AUTHORIZATION_DECISIONS.ALLOW,

        allowed:
            true,

        installationId,
    };
}


/*
|--------------------------------------------------------------------------
| 1. Strict identity reader
|--------------------------------------------------------------------------
*/

assert.equal(
    readForecastIdentityVrmSiteId({
        identity:
            {
                vrmSiteId:
                    "18053",
            },
    }),
    "18053"
);

pass(
    "identity.vrmSiteId is the authoritative Forecast ACL identity"
);


assert.equal(
    readForecastIdentityVrmSiteId({
        identity:
            {
                vrmSiteId:
                    " 18053 ",
            },
    }),
    "18053"
);

pass(
    "Forecast ACL identity is normalized without changing its source"
);


assert.equal(
    readForecastIdentityVrmSiteId({
        target:
            {
                vrmSiteId:
                    "18053",
            },
    }),
    null
);

pass(
    "target.vrmSiteId is never used as an ACL fallback"
);


assert.equal(
    readForecastIdentityVrmSiteId({
        identity:
            {
                vrmSiteId:
                    "   ",
            },

        target:
            {
                vrmSiteId:
                    "18053",
            },
    }),
    null
);

pass(
    "blank identity.vrmSiteId fails closed even when target.vrmSiteId exists"
);


/*
|--------------------------------------------------------------------------
| 2. Successful authorization sequence
|--------------------------------------------------------------------------
*/

{
    const events =
        [];

    const record =
        {
            _id:
                "forecast-record-id",

            persistenceKey:
                "opaque-key",

            identity:
                {
                    vrmSiteId:
                        "18053",
                },

            target:
                {
                    vrmSiteId:
                        "99999",
                },
        };

    const result =
        await authorizeForecastRecord({
            userId,
            record,

            async resolveInstallation({
                vrmSiteId,
            }) {
                events.push({
                    type:
                        "resolve",
                    vrmSiteId,
                });

                return resolvedInstallation({
                    vrmSiteId,
                });
            },

            async authorizeResource({
                userId:
                    receivedUserId,
                installationId:
                    receivedInstallationId,
            }) {
                events.push({
                    type:
                        "authorize",

                    userId:
                        receivedUserId,

                    installationId:
                        receivedInstallationId,
                });

                return allowAuthorization();
            },
        });

    assert.deepEqual(
        events,
        [
            {
                type:
                    "resolve",
                vrmSiteId:
                    "18053",
            },
            {
                type:
                    "authorize",
                userId,
                installationId,
            },
        ]
    );

    pass(
        "authorization resolves identity.vrmSiteId before checking user entitlement"
    );


    assert.equal(
        result.decision,
        FORECAST_RECORD_AUTHORIZATION_DECISIONS.ALLOW
    );

    assert.equal(
        result.allowed,
        true
    );

    assert.equal(
        result.vrmSiteId,
        "18053"
    );

    assert.equal(
        result.installationId,
        installationId
    );

    pass(
        "authorized ForecastRecord returns ALLOW with resolved site identity"
    );


    assert.equal(
        result.equipmentControlAllowed,
        false
    );

    assert.equal(
        result.automaticDispatchAllowed,
        false
    );

    pass(
        "Forecast authorization cannot enable equipment control or automatic dispatch"
    );
}


/*
|--------------------------------------------------------------------------
| 3. Missing/malformed identity fails before resolver
|--------------------------------------------------------------------------
*/

{
    let resolverCalled =
        false;

    let authorizerCalled =
        false;

    const result =
        await authorizeForecastRecord({
            userId,

            record:
                {
                    target:
                        {
                            vrmSiteId:
                                "18053",
                        },
                },

            async resolveInstallation() {
                resolverCalled =
                    true;

                return resolvedInstallation();
            },

            async authorizeResource() {
                authorizerCalled =
                    true;

                return allowAuthorization();
            },
        });

    assert.equal(
        result.decision,
        FORECAST_RECORD_AUTHORIZATION_DECISIONS.DENY
    );

    assert.equal(
        result.reason,
        FORECAST_RECORD_AUTHORIZATION_REASONS
            .FORECAST_IDENTITY_MISSING
    );

    assert.equal(
        resolverCalled,
        false
    );

    assert.equal(
        authorizerCalled,
        false
    );

    pass(
        "missing strict Forecast identity fails closed before Installation lookup"
    );
}


/*
|--------------------------------------------------------------------------
| 4. Installation NOT_FOUND fails closed
|--------------------------------------------------------------------------
*/

{
    let authorizerCalled =
        false;

    const result =
        await authorizeForecastRecord({
            userId,

            record:
                {
                    identity:
                        {
                            vrmSiteId:
                                "18053",
                        },
                },

            async resolveInstallation() {
                return {
                    status:
                        INSTALLATION_RESOURCE_RESOLUTION.NOT_FOUND,

                    vrmSiteId:
                        "18053",

                    installationId:
                        null,
                };
            },

            async authorizeResource() {
                authorizerCalled =
                    true;

                return allowAuthorization();
            },
        });

    assert.equal(
        result.decision,
        FORECAST_RECORD_AUTHORIZATION_DECISIONS.DENY
    );

    assert.equal(
        result.reason,
        FORECAST_RECORD_AUTHORIZATION_REASONS
            .INSTALLATION_NOT_FOUND
    );

    assert.equal(
        authorizerCalled,
        false
    );

    pass(
        "unmapped Forecast site fails closed before entitlement lookup"
    );
}


/*
|--------------------------------------------------------------------------
| 5. Resolver INVALID/unknown fails closed
|--------------------------------------------------------------------------
*/

{
    const result =
        await authorizeForecastRecord({
            userId,

            record:
                {
                    identity:
                        {
                            vrmSiteId:
                                "18053",
                        },
                },

            async resolveInstallation() {
                return {
                    status:
                        INSTALLATION_RESOURCE_RESOLUTION.INVALID,
                };
            },

            async authorizeResource() {
                throw new Error(
                    "AUTHORIZER_SHOULD_NOT_RUN"
                );
            },
        });

    assert.equal(
        result.decision,
        FORECAST_RECORD_AUTHORIZATION_DECISIONS.DENY
    );

    assert.equal(
        result.reason,
        FORECAST_RECORD_AUTHORIZATION_REASONS
            .INSTALLATION_RESOLUTION_INVALID
    );

    pass(
        "invalid Installation resolution fails closed"
    );
}


{
    const result =
        await authorizeForecastRecord({
            userId,

            record:
                {
                    identity:
                        {
                            vrmSiteId:
                                "18053",
                        },
                },

            async resolveInstallation() {
                return {
                    status:
                        "UNKNOWN",
                };
            },

            async authorizeResource() {
                throw new Error(
                    "AUTHORIZER_SHOULD_NOT_RUN"
                );
            },
        });

    assert.equal(
        result.decision,
        FORECAST_RECORD_AUTHORIZATION_DECISIONS.DENY
    );

    pass(
        "unknown Installation resolution fails closed"
    );
}


/*
|--------------------------------------------------------------------------
| 6. Resolver unavailable / exception
|--------------------------------------------------------------------------
*/

{
    const result =
        await authorizeForecastRecord({
            userId,

            record:
                {
                    identity:
                        {
                            vrmSiteId:
                                "18053",
                        },
                },

            async resolveInstallation() {
                return {
                    status:
                        INSTALLATION_RESOURCE_RESOLUTION.UNAVAILABLE,
                };
            },

            async authorizeResource() {
                throw new Error(
                    "AUTHORIZER_SHOULD_NOT_RUN"
                );
            },
        });

    assert.equal(
        result.decision,
        FORECAST_RECORD_AUTHORIZATION_DECISIONS.UNAVAILABLE
    );

    pass(
        "Installation resolver UNAVAILABLE propagates as authorization unavailable"
    );
}


{
    const result =
        await authorizeForecastRecord({
            userId,

            record:
                {
                    identity:
                        {
                            vrmSiteId:
                                "18053",
                        },
                },

            async resolveInstallation() {
                throw new Error(
                    "RESOLVER_FAILURE"
                );
            },

            async authorizeResource() {
                throw new Error(
                    "AUTHORIZER_SHOULD_NOT_RUN"
                );
            },
        });

    assert.equal(
        result.decision,
        FORECAST_RECORD_AUTHORIZATION_DECISIONS.UNAVAILABLE
    );

    pass(
        "Installation resolver exception fails closed as unavailable"
    );
}


/*
|--------------------------------------------------------------------------
| 7. Entitlement DENY
|--------------------------------------------------------------------------
*/

{
    const result =
        await authorizeForecastRecord({
            userId,

            record:
                {
                    identity:
                        {
                            vrmSiteId:
                                "18053",
                        },
                },

            async resolveInstallation() {
                return resolvedInstallation();
            },

            async authorizeResource() {
                return {
                    decision:
                        SITE_RESOURCE_AUTHORIZATION_DECISIONS.DENY,

                    allowed:
                        false,
                };
            },
        });

    assert.equal(
        result.decision,
        FORECAST_RECORD_AUTHORIZATION_DECISIONS.DENY
    );

    assert.equal(
        result.reason,
        FORECAST_RECORD_AUTHORIZATION_REASONS
            .SITE_ACCESS_DENIED
    );

    pass(
        "missing Forecast site entitlement returns DENY"
    );
}


/*
|--------------------------------------------------------------------------
| 8. Entitlement unavailable / exception
|--------------------------------------------------------------------------
*/

{
    const result =
        await authorizeForecastRecord({
            userId,

            record:
                {
                    identity:
                        {
                            vrmSiteId:
                                "18053",
                        },
                },

            async resolveInstallation() {
                return resolvedInstallation();
            },

            async authorizeResource() {
                return {
                    decision:
                        SITE_RESOURCE_AUTHORIZATION_DECISIONS.UNAVAILABLE,

                    allowed:
                        false,
                };
            },
        });

    assert.equal(
        result.decision,
        FORECAST_RECORD_AUTHORIZATION_DECISIONS.UNAVAILABLE
    );

    pass(
        "site authorization UNAVAILABLE propagates as unavailable"
    );
}


{
    const result =
        await authorizeForecastRecord({
            userId,

            record:
                {
                    identity:
                        {
                            vrmSiteId:
                                "18053",
                        },
                },

            async resolveInstallation() {
                return resolvedInstallation();
            },

            async authorizeResource() {
                throw new Error(
                    "AUTHORIZATION_FAILURE"
                );
            },
        });

    assert.equal(
        result.decision,
        FORECAST_RECORD_AUTHORIZATION_DECISIONS.UNAVAILABLE
    );

    pass(
        "site authorization exception fails closed as unavailable"
    );
}


/*
|--------------------------------------------------------------------------
| 9. Missing user cannot be authorized
|--------------------------------------------------------------------------
*/

{
    let receivedUserId =
        "NOT_CALLED";

    const result =
        await authorizeForecastRecord({
            userId:
                undefined,

            record:
                {
                    identity:
                        {
                            vrmSiteId:
                                "18053",
                        },
                },

            async resolveInstallation() {
                return resolvedInstallation();
            },

            async authorizeResource({
                userId:
                    suppliedUserId,
            }) {
                receivedUserId =
                    suppliedUserId;

                return {
                    decision:
                        SITE_RESOURCE_AUTHORIZATION_DECISIONS.DENY,
                };
            },
        });

    assert.equal(
        receivedUserId,
        undefined
    );

    assert.equal(
        result.decision,
        FORECAST_RECORD_AUTHORIZATION_DECISIONS.DENY
    );

    pass(
        "missing authenticated principal cannot produce Forecast ALLOW"
    );
}


/*
|--------------------------------------------------------------------------
| 10. Malformed authorization output fails closed
|--------------------------------------------------------------------------
*/

{
    const result =
        await authorizeForecastRecord({
            userId,

            record:
                {
                    identity:
                        {
                            vrmSiteId:
                                "18053",
                        },
                },

            async resolveInstallation() {
                return resolvedInstallation();
            },

            async authorizeResource() {
                return {
                    decision:
                        "UNKNOWN",
                    allowed:
                        true,
                };
            },
        });

    assert.equal(
        result.decision,
        FORECAST_RECORD_AUTHORIZATION_DECISIONS.DENY
    );

    pass(
        "unknown site-authorization decision cannot produce Forecast ALLOW"
    );
}


/*
|--------------------------------------------------------------------------
| 11. Dependency injection fails closed
|--------------------------------------------------------------------------
*/

await assert.rejects(
    () =>
        authorizeForecastRecord({
            userId,

            record:
                {
                    identity:
                        {
                            vrmSiteId:
                                "18053",
                        },
                },

            resolveInstallation:
                null,

            authorizeResource:
                async () =>
                    allowAuthorization(),
        }),
    /FORECAST_INSTALLATION_RESOLVER_REQUIRED/
);

pass(
    "Forecast authorization rejects missing Installation resolver"
);


await assert.rejects(
    () =>
        authorizeForecastRecord({
            userId,

            record:
                {
                    identity:
                        {
                            vrmSiteId:
                                "18053",
                        },
                },

            resolveInstallation:
                async () =>
                    resolvedInstallation(),

            authorizeResource:
                null,
        }),
    /FORECAST_SITE_AUTHORIZER_REQUIRED/
);

pass(
    "Forecast authorization rejects missing site authorizer"
);


console.log(
    "\n================================================"
);

console.log(
    "P.1H-G3-D4-B VALIDATION PASSED"
);

console.log(
    "================================================"
);

console.log(
    `PASS: ${passed}/${passed}`
);
