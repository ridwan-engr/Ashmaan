import assert from "node:assert/strict";

import {
    createForecastingApiService,
} from "../services/forecasting/forecastingApiService.js";


let passed =
    0;


function pass(
    description
) {
    passed +=
        1;

    console.log(
        `PASS ${passed}: ${description}`
    );
}


function createQuery({
    records = [],
    trace,
}) {
    let currentRecords =
        [...records];

    const query = {
        sort(
            specification
        ) {
            trace.push({
                operation:
                    "sort",

                specification,
            });

            return query;
        },

        skip(
            value
        ) {
            trace.push({
                operation:
                    "skip",

                value,
            });

            currentRecords =
                currentRecords.slice(
                    value
                );

            return query;
        },

        limit(
            value
        ) {
            trace.push({
                operation:
                    "limit",

                value,
            });

            currentRecords =
                currentRecords.slice(
                    0,
                    value
                );

            return query;
        },

        lean() {
            trace.push({
                operation:
                    "lean",
            });

            return Promise.resolve(
                currentRecords
            );
        },
    };

    return query;
}


function createMockModel({
    records = [],
} = {}) {
    const trace =
        [];

    const model = {
        trace,

        find(
            filter
        ) {
            trace.push({
                operation:
                    "find",

                filter,
            });

            let scoped =
                [...records];

            const siteFilter =
                filter?.[
                    "identity.vrmSiteId"
                ];

            if (
                typeof siteFilter ===
                    "string"
            ) {
                scoped =
                    scoped.filter(
                        (record) =>
                            record?.identity
                                ?.vrmSiteId ===
                            siteFilter
                    );
            }
            else if (
                siteFilter &&
                Array.isArray(
                    siteFilter.$in
                )
            ) {
                scoped =
                    scoped.filter(
                        (record) =>
                            siteFilter.$in
                                .includes(
                                    record?.identity
                                        ?.vrmSiteId
                                )
                    );
            }

            return createQuery({
                records:
                    scoped,

                trace,
            });
        },

        findOne() {
            return {
                sort() {
                    return this;
                },

                lean() {
                    return Promise.resolve(
                        null
                    );
                },
            };
        },

        findById() {
            return {
                lean() {
                    return Promise.resolve(
                        null
                    );
                },
            };
        },
    };

    return model;
}


const records =
    [
        {
            _id:
                "forecast-a",

            identity: {
                vrmSiteId:
                    "18053",
            },
        },

        {
            _id:
                "forecast-b",

            identity: {
                vrmSiteId:
                    "20000",
            },
        },

        {
            _id:
                "forecast-c",

            identity: {
                vrmSiteId:
                    "30000",
            },
        },
    ];


/*
|--------------------------------------------------------------------------
| 1. Legacy behavior remains available to trusted internal callers
|--------------------------------------------------------------------------
*/

{
    const model =
        createMockModel({
            records,
        });

    const service =
        createForecastingApiService({
            ForecastRecordModel:
                model,
        });

    const result =
        await service.listForecasts();

    const findCall =
        model.trace.find(
            (entry) =>
                entry.operation ===
                "find"
        );

    assert.deepEqual(
        findCall.filter,
        {}
    );

    pass(
        "undefined trusted scope preserves existing internal unrestricted filter"
    );

    assert.equal(
        result.records.length,
        3
    );

    pass(
        "legacy internal list behavior remains backward-compatible"
    );
}


/*
|--------------------------------------------------------------------------
| 2. Authorized collection scope becomes MongoDB $in filter
|--------------------------------------------------------------------------
*/

{
    const model =
        createMockModel({
            records,
        });

    const service =
        createForecastingApiService({
            ForecastRecordModel:
                model,
        });

    const result =
        await service.listForecasts({
            allowedVrmSiteIds: [
                "18053",
                "20000",
            ],
        });

    const findCall =
        model.trace.find(
            (entry) =>
                entry.operation ===
                "find"
        );

    assert.deepEqual(
        findCall.filter[
            "identity.vrmSiteId"
        ],
        {
            $in: [
                "18053",
                "20000",
            ],
        }
    );

    pass(
        "authorized site collection is constrained in the MongoDB filter"
    );

    assert.deepEqual(
        result.records.map(
            (record) =>
                record._id
        ),
        [
            "forecast-a",
            "forecast-b",
        ]
    );

    pass(
        "authorized collection returns only entitled site records"
    );
}


/*
|--------------------------------------------------------------------------
| 3. Zero entitlement is explicit empty scope
|--------------------------------------------------------------------------
*/

{
    const model =
        createMockModel({
            records,
        });

    const service =
        createForecastingApiService({
            ForecastRecordModel:
                model,
        });

    const result =
        await service.listForecasts({
            allowedVrmSiteIds:
                [],
        });

    const findCall =
        model.trace.find(
            (entry) =>
                entry.operation ===
                "find"
        );

    assert.deepEqual(
        findCall.filter[
            "identity.vrmSiteId"
        ],
        {
            $in: [],
        }
    );

    pass(
        "zero entitlement produces explicit $in empty scope"
    );

    assert.deepEqual(
        result.records,
        []
    );

    pass(
        "zero entitlement cannot return unrestricted forecasts"
    );
}


/*
|--------------------------------------------------------------------------
| 4. Explicit requested site inside authorized scope
|--------------------------------------------------------------------------
*/

{
    const model =
        createMockModel({
            records,
        });

    const service =
        createForecastingApiService({
            ForecastRecordModel:
                model,
        });

    const result =
        await service.listForecasts({
            vrmSiteId:
                "18053",

            allowedVrmSiteIds: [
                "18053",
                "20000",
            ],
        });

    const findCall =
        model.trace.find(
            (entry) =>
                entry.operation ===
                "find"
        );

    assert.deepEqual(
        findCall.filter[
            "identity.vrmSiteId"
        ],
        {
            $in: [
                "18053",
            ],
        }
    );

    pass(
        "explicit authorized site is intersected with trusted scope"
    );

    assert.deepEqual(
        result.records.map(
            (record) =>
                record._id
        ),
        [
            "forecast-a",
        ]
    );

    pass(
        "authorized explicit site returns only that site's forecast"
    );
}


/*
|--------------------------------------------------------------------------
| 5. Explicit requested site outside authorized scope
|--------------------------------------------------------------------------
*/

{
    const model =
        createMockModel({
            records,
        });

    const service =
        createForecastingApiService({
            ForecastRecordModel:
                model,
        });

    const result =
        await service.listForecasts({
            vrmSiteId:
                "30000",

            allowedVrmSiteIds: [
                "18053",
                "20000",
            ],
        });

    const findCall =
        model.trace.find(
            (entry) =>
                entry.operation ===
                "find"
        );

    assert.deepEqual(
        findCall.filter[
            "identity.vrmSiteId"
        ],
        {
            $in: [],
        }
    );

    pass(
        "unauthorized explicit site becomes an empty MongoDB scope"
    );

    assert.deepEqual(
        result.records,
        []
    );

    pass(
        "unauthorized explicit site cannot return its forecast"
    );
}


/*
|--------------------------------------------------------------------------
| 6. Trusted scope normalization
|--------------------------------------------------------------------------
*/

{
    const model =
        createMockModel({
            records,
        });

    const service =
        createForecastingApiService({
            ForecastRecordModel:
                model,
        });

    await service.listForecasts({
        allowedVrmSiteIds: [
            " 18053 ",
            "18053",
            "",
            "   ",
            "20000",
            "20000",
        ],
    });

    const findCall =
        model.trace.find(
            (entry) =>
                entry.operation ===
                "find"
        );

    assert.deepEqual(
        findCall.filter[
            "identity.vrmSiteId"
        ],
        {
            $in: [
                "18053",
                "20000",
            ],
        }
    );

    pass(
        "trusted site scope trims blanks and deduplicates site identities"
    );
}


/*
|--------------------------------------------------------------------------
| 7. Malformed trusted scope fails closed
|--------------------------------------------------------------------------
*/

{
    const model =
        createMockModel({
            records,
        });

    const service =
        createForecastingApiService({
            ForecastRecordModel:
                model,
        });

    await assert.rejects(
        () =>
            service.listForecasts({
                allowedVrmSiteIds:
                    "18053",
            }),

        (error) =>
            error instanceof
                TypeError &&
            error.message ===
                "ALLOWED_VRM_SITE_IDS_ARRAY_REQUIRED"
    );

    pass(
        "non-array trusted site scope is rejected"
    );

    assert.equal(
        model.trace.some(
            (entry) =>
                entry.operation ===
                "find"
        ),
        false
    );

    pass(
        "malformed trusted scope is rejected before ForecastRecord.find"
    );
}


/*
|--------------------------------------------------------------------------
| 8. Scope is applied before pagination
|--------------------------------------------------------------------------
*/

{
    const model =
        createMockModel({
            records,
        });

    const service =
        createForecastingApiService({
            ForecastRecordModel:
                model,
        });

    await service.listForecasts({
        allowedVrmSiteIds: [
            "18053",
        ],

        page:
            2,

        limit:
            1,
    });

    const operations =
        model.trace.map(
            (entry) =>
                entry.operation
        );

    const findIndex =
        operations.indexOf(
            "find"
        );

    const skipIndex =
        operations.indexOf(
            "skip"
        );

    const limitIndex =
        operations.indexOf(
            "limit"
        );

    assert.ok(
        findIndex !== -1 &&
        skipIndex !== -1 &&
        limitIndex !== -1 &&
        findIndex < skipIndex &&
        findIndex < limitIndex
    );

    pass(
        "authorized site filter is supplied before skip and limit pagination"
    );
}


/*
|--------------------------------------------------------------------------
| 9. Existing explicit-site behavior remains compatible when ACL scope omitted
|--------------------------------------------------------------------------
*/

{
    const model =
        createMockModel({
            records,
        });

    const service =
        createForecastingApiService({
            ForecastRecordModel:
                model,
        });

    await service.listForecasts({
        vrmSiteId:
            "18053",
    });

    const findCall =
        model.trace.find(
            (entry) =>
                entry.operation ===
                "find"
        );

    assert.equal(
        findCall.filter[
            "identity.vrmSiteId"
        ],
        "18053"
    );

    pass(
        "existing explicit-site internal query remains backward-compatible when trusted scope is omitted"
    );
}


/*
|--------------------------------------------------------------------------
| Final
|--------------------------------------------------------------------------
*/

console.log(
    ""
);

console.log(
    "================================================"
);

console.log(
    "P.1H-G3-C2 VALIDATION PASSED"
);

console.log(
    "================================================"
);

console.log(
    `PASS: ${passed}/${passed}`
);
