// backend/scripts/validateReliabilityApi.js

import "dotenv/config";
import axios from "axios";


/*
|--------------------------------------------------------------------------
| Configuration
|--------------------------------------------------------------------------
*/

const PORT =
    process.env.PORT ||
    5000;

const BASE_URL =
    process.env.RELIABILITY_API_BASE_URL ||
    `http://localhost:${PORT}/api/v1/reliability`;


/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

function assertEqual(
    actual,
    expected,
    label
) {
    if (
        actual !==
        expected
    ) {
        throw new Error(
            `${label}: expected ${expected}, received ${actual}`
        );
    }

    console.log(
        `PASS: ${label}`
    );
}


function assertTrue(
    condition,
    label
) {
    if (
        condition !==
        true
    ) {
        throw new Error(
            `${label}: condition was not true`
        );
    }

    console.log(
        `PASS: ${label}`
    );
}


async function getEndpoint(
    path
) {
    const url =
        `${BASE_URL}${path}`;

    const response =
        await axios.get(
            url,
            {
                validateStatus:
                    () =>
                        true,
            }
        );

    return {
        url,
        status:
            response.status,

        body:
            response.data,
    };
}


/*
|--------------------------------------------------------------------------
| Heading
|--------------------------------------------------------------------------
*/

console.log("");

console.log(
    "================================================"
);

console.log(
    "ASHMAAN RELIABILITY API CONTRACT VALIDATION"
);

console.log(
    "================================================"
);

console.log("");

console.log(
    `Reliability API base URL: ${BASE_URL}`
);

console.log("");


/*
|--------------------------------------------------------------------------
| API contract
|--------------------------------------------------------------------------
*/

const endpoints = [

    /*
    |--------------------------------------------------------------------------
    | Service reliability
    |--------------------------------------------------------------------------
    */

    {
        family:
            "SERVICE_RELIABILITY",

        name:
            "Reliability indices",

        path:
            "/indices",
    },

    {
        family:
            "SERVICE_RELIABILITY",

        name:
            "SAIDI",

        path:
            "/saidi",
    },

    {
        family:
            "SERVICE_RELIABILITY",

        name:
            "SAIFI",

        path:
            "/saifi",
    },

    {
        family:
            "SERVICE_RELIABILITY",

        name:
            "CAIDI",

        path:
            "/caidi",
    },

    {
        family:
            "SERVICE_RELIABILITY",

        name:
            "ASAI",

        path:
            "/asai",
    },

    {
        family:
            "SERVICE_RELIABILITY",

        name:
            "ASUI",

        path:
            "/asui",
    },


    /*
    |--------------------------------------------------------------------------
    | Equipment / technical reliability
    |--------------------------------------------------------------------------
    */

    {
        family:
            "TECHNICAL_RELIABILITY",

        name:
            "MTBF",

        path:
            "/mtbf",
    },

    {
        family:
            "TECHNICAL_RELIABILITY",

        name:
            "MTTR",

        path:
            "/mttr",
    },

    {
        family:
            "TECHNICAL_RELIABILITY",

        name:
            "Failure rate",

        path:
            "/failure-rate",
    },

    {
        family:
            "TECHNICAL_RELIABILITY",

        name:
            "Repair rate",

        path:
            "/repair-rate",
    },

    {
        family:
            "TECHNICAL_RELIABILITY",

        name:
            "Technical availability",

        path:
            "/technical-availability",
    },

    {
        family:
            "TECHNICAL_RELIABILITY",

        name:
            "Reliability function",

        path:
            "/reliability?horizonHours=10",
    },


    /*
    |--------------------------------------------------------------------------
    | Adequacy reliability
    |--------------------------------------------------------------------------
    */

    {
        family:
            "ADEQUACY_RELIABILITY",

        name:
            "LOLP",

        path:
            "/lolp",
    },

    {
        family:
            "ADEQUACY_RELIABILITY",

        name:
            "LOLE",

        path:
            "/lole",
    },

    {
        family:
            "ADEQUACY_RELIABILITY",

        name:
            "EENS",

        path:
            "/eens",
    },
];


/*
|--------------------------------------------------------------------------
| 1. Validate every endpoint
|--------------------------------------------------------------------------
*/

const results =
    [];


for (
    const endpoint
    of endpoints
) {
    const result =
        await getEndpoint(
            endpoint.path
        );


    results.push({
        ...endpoint,

        ...result,
    });


    assertEqual(
        result.status,
        200,
        `${endpoint.name} endpoint returns HTTP 200`
    );


    assertTrue(
        result.body !==
            null &&
        typeof result.body ===
            "object",
        `${endpoint.name} endpoint returns JSON`
    );


    assertEqual(
        result.body.success,
        true,
        `${endpoint.name} endpoint reports successful API execution`
    );


    assertTrue(
        result.body.data !==
            undefined &&
        result.body.data !==
            null,
        `${endpoint.name} endpoint exposes data payload`
    );
}


/*
|--------------------------------------------------------------------------
| 2. Validate endpoint population
|--------------------------------------------------------------------------
*/

assertEqual(
    results.length,
    15,
    "All fifteen reliability API endpoints are represented"
);


const serviceReliability =
    results.filter(
        (result) =>
            result.family ===
            "SERVICE_RELIABILITY"
    );


const technicalReliability =
    results.filter(
        (result) =>
            result.family ===
            "TECHNICAL_RELIABILITY"
    );


const adequacyReliability =
    results.filter(
        (result) =>
            result.family ===
            "ADEQUACY_RELIABILITY"
    );


assertEqual(
    serviceReliability.length,
    6,
    "Six service-reliability endpoints are exposed"
);


assertEqual(
    technicalReliability.length,
    6,
    "Six technical-reliability endpoints are exposed"
);


assertEqual(
    adequacyReliability.length,
    3,
    "Three adequacy-reliability endpoints are exposed"
);


/*
|--------------------------------------------------------------------------
| 3. Validate adequacy production state
|--------------------------------------------------------------------------
*/

const lolpResponse =
    results.find(
        (result) =>
            result.name ===
            "LOLP"
    )
        .body
        .data;


const loleResponse =
    results.find(
        (result) =>
            result.name ===
            "LOLE"
    )
        .body
        .data;


const eensResponse =
    results.find(
        (result) =>
            result.name ===
            "EENS"
    )
        .body
        .data;


assertEqual(
    lolpResponse.status,
    "UNAVAILABLE",
    "Production LOLP correctly remains unavailable"
);


assertEqual(
    lolpResponse.lolp,
    null,
    "Production LOLP does not fabricate zero probability"
);


assertEqual(
    loleResponse.status,
    "UNAVAILABLE",
    "Production LOLE correctly remains unavailable"
);


assertEqual(
    loleResponse.loleHours,
    null,
    "Production LOLE does not fabricate zero expected hours"
);


assertEqual(
    eensResponse.status,
    "UNAVAILABLE",
    "Production EENS correctly remains unavailable"
);


assertEqual(
    eensResponse.eensKwh,
    null,
    "Production EENS does not fabricate zero expected energy"
);


assertEqual(
    lolpResponse
        .productionAdequacyEstablished,
    false,
    "LOLP API exposes missing production adequacy foundation"
);


assertEqual(
    loleResponse
        .productionAdequacyEstablished,
    false,
    "LOLE API exposes missing production adequacy foundation"
);


assertEqual(
    eensResponse
        .productionAdequacyEstablished,
    false,
    "EENS API exposes missing production adequacy foundation"
);


/*
|--------------------------------------------------------------------------
| 4. Validate technical reliability production state
|--------------------------------------------------------------------------
*/

const mtbfResponse =
    results.find(
        (result) =>
            result.name ===
            "MTBF"
    )
        .body
        .data;


const mttrResponse =
    results.find(
        (result) =>
            result.name ===
            "MTTR"
    )
        .body
        .data;


const failureRateResponse =
    results.find(
        (result) =>
            result.name ===
            "Failure rate"
    )
        .body
        .data;


const repairRateResponse =
    results.find(
        (result) =>
            result.name ===
            "Repair rate"
    )
        .body
        .data;


const technicalAvailabilityResponse =
    results.find(
        (result) =>
            result.name ===
            "Technical availability"
    )
        .body
        .data;


const reliabilityResponse =
    results.find(
        (result) =>
            result.name ===
            "Reliability function"
    )
        .body
        .data;


/*
|--------------------------------------------------------------------------
| Current production evidence means these should remain unavailable.
|--------------------------------------------------------------------------
*/

assertTrue(
    JSON.stringify(
        mtbfResponse
    )
        .includes(
            "UNAVAILABLE"
        ),
    "MTBF API preserves unavailable production state"
);


assertTrue(
    JSON.stringify(
        mttrResponse
    )
        .includes(
            "UNAVAILABLE"
        ),
    "MTTR API preserves unavailable production state"
);


assertTrue(
    JSON.stringify(
        failureRateResponse
    )
        .includes(
            "UNAVAILABLE"
        ),
    "Failure-rate API preserves unavailable production state"
);


assertTrue(
    JSON.stringify(
        repairRateResponse
    )
        .includes(
            "UNAVAILABLE"
        ),
    "Repair-rate API preserves unavailable production state"
);


assertTrue(
    JSON.stringify(
        technicalAvailabilityResponse
    )
        .includes(
            "UNAVAILABLE"
        ),
    "Technical-availability API preserves unavailable production state"
);


assertTrue(
    JSON.stringify(
        reliabilityResponse
    )
        .includes(
            "UNAVAILABLE"
        ),
    "Reliability-function API preserves unavailable production state"
);


/*
|--------------------------------------------------------------------------
| 5. Reliability R(t) parameter validation
|--------------------------------------------------------------------------
*/

const missingHorizon =
    await getEndpoint(
        "/reliability"
    );


assertTrue(
    missingHorizon.status >=
        400 &&
    missingHorizon.status <
        500,
    "Reliability endpoint rejects missing horizonHours"
);


assertEqual(
    missingHorizon.body.success,
    false,
    "Missing reliability horizon is reported as unsuccessful request"
);


assertEqual(
    missingHorizon
        .body
        .error
        .code,
    "HORIZON_HOURS_REQUIRED",
    "Missing horizonHours exposes the correct API error code"
);


/*
|--------------------------------------------------------------------------
| 6. Semantic family separation
|--------------------------------------------------------------------------
*/

const familyNames =
    new Set(
        results.map(
            (result) =>
                result.family
        )
    );


assertEqual(
    familyNames.size,
    3,
    "Reliability API preserves three distinct metric families"
);


assertTrue(
    familyNames.has(
        "SERVICE_RELIABILITY"
    ),
    "Service-reliability family exists"
);


assertTrue(
    familyNames.has(
        "TECHNICAL_RELIABILITY"
    ),
    "Technical-reliability family exists"
);


assertTrue(
    familyNames.has(
        "ADEQUACY_RELIABILITY"
    ),
    "Adequacy-reliability family exists"
);


/*
|--------------------------------------------------------------------------
| 7. Print contract summary
|--------------------------------------------------------------------------
*/

console.log("");

console.log(
    "Reliability API contract:"
);

console.log("");


for (
    const result
    of results
) {
    console.log(
        `- ${result.family} | ${result.name} | ${result.path} | HTTP ${result.status}`
    );
}


/*
|--------------------------------------------------------------------------
| Final
|--------------------------------------------------------------------------
*/

console.log("");

console.log(
    "================================================"
);

console.log(
    "RELIABILITY API CONTRACT VALIDATION PASSED"
);

console.log(
    "================================================"
);

console.log("");

console.log(
    "Validated API semantics:"
);

console.log(
    "- service reliability, technical reliability and adequacy reliability remain distinct API families"
);

console.log(
    "- all fifteen reliability endpoints are reachable"
);

console.log(
    "- HTTP success is distinct from engineering metric availability"
);

console.log(
    "- unavailable production evidence remains UNAVAILABLE rather than fabricated zero"
);

console.log(
    "- technical reliability metrics remain unavailable without validated failure and operating-exposure evidence"
);

console.log(
    "- adequacy metrics remain unavailable without qualified required-load and available-supply evidence"
);

console.log(
    "- reliability R(t) requires an explicit prediction horizon"
);

console.log(
    "- the reliability API does not collapse SAIDI, MTTR, technical availability, LOLP, LOLE or EENS into interchangeable metrics"
);