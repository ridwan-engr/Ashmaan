import {
    HISTORICAL_TELEMETRY_ATTRIBUTE_IDS,
} from "../services/sync/telemetryPersistencePolicy.js";

import {
    BATTERY_ATTRIBUTE_MAP,
} from "../services/engineering/batteryAttributeMap.js";

import {
    GENERATOR_ATTRIBUTE_MAP,
} from "../services/engineering/generatorAttributeMap.js";

import {
    GRID_ATTRIBUTE_MAP,
    GRID_ANALYTICS_QUERY_ATTRIBUTES,
} from "../services/engineering/gridAttributeMap.js";

import {
    SOLAR_ATTRIBUTE_IDS,
} from "../services/engineering/solarAttributeMap.js";

const separator = "=".repeat(72);
const subSeparator = "-".repeat(72);

const failures = [];

function fail(message) {
    failures.push(message);
}

function normalizeIds(values, label) {
    const ids = [];

    for (const rawValue of values) {
        const numeric = Number(rawValue);

        if (!Number.isInteger(numeric) || numeric < 0) {
            fail(
                `${label}: invalid attribute ID encountered: ${String(rawValue)}`
            );
            continue;
        }

        ids.push(numeric);
    }

    return [...new Set(ids)].sort((a, b) => a - b);
}

function idsFromAttributeMap(map, label) {
    if (
        map === null ||
        typeof map !== "object" ||
        Array.isArray(map)
    ) {
        fail(`${label}: expected an object attribute map`);
        return [];
    }

    const ids = [];

    for (const [key, definition] of Object.entries(map)) {
        const keyId = Number(key);

        if (!Number.isInteger(keyId) || keyId < 0) {
            fail(`${label}: invalid map key: ${key}`);
            continue;
        }

        /*
         * Battery / Generator / Grid maps expose attributeId.
         *
         * Validate the definition against the map key rather than merely
         * trusting Object.keys(). This protects the dependency contract
         * against accidental key/definition divergence.
         */
        const definitionId = Number(definition?.attributeId);

        if (
            !Number.isInteger(definitionId) ||
            definitionId < 0
        ) {
            fail(
                `${label}: map entry ${key} has invalid/missing attributeId`
            );
            continue;
        }

        if (definitionId !== keyId) {
            fail(
                `${label}: map key ${keyId} != definition.attributeId ${definitionId}`
            );
            continue;
        }

        ids.push(keyId);
    }

    return normalizeIds(ids, label);
}

function printIds(ids) {
    if (ids.length === 0) {
        console.log("  (none)");
        return;
    }

    const width = 10;

    for (let index = 0; index < ids.length; index += width) {
        console.log(
            "  " +
                ids
                    .slice(index, index + width)
                    .join(", ")
        );
    }
}

function difference(left, right) {
    const rightSet = new Set(right);

    return left.filter(
        (value) => !rightSet.has(value)
    );
}

function intersection(left, right) {
    const rightSet = new Set(right);

    return left.filter(
        (value) => rightSet.has(value)
    );
}

console.log(`\n${separator}`);
console.log("ASHMAAN HISTORICAL PERSISTENCE DEPENDENCY VALIDATOR");
console.log(separator);
console.log("Mode: READ ONLY");
console.log("MongoDB: NOT USED");
console.log("VRM API: NOT USED");
console.log("Scheduler: NOT USED");
console.log("Source extraction: RUNTIME ES-MODULE EXPORTS");

const batteryIds =
    idsFromAttributeMap(
        BATTERY_ATTRIBUTE_MAP,
        "BATTERY_ATTRIBUTE_MAP"
    );

const generatorIds =
    idsFromAttributeMap(
        GENERATOR_ATTRIBUTE_MAP,
        "GENERATOR_ATTRIBUTE_MAP"
    );

const gridMapIds =
    idsFromAttributeMap(
        GRID_ATTRIBUTE_MAP,
        "GRID_ATTRIBUTE_MAP"
    );

const gridQueryIds =
    normalizeIds(
        GRID_ANALYTICS_QUERY_ATTRIBUTES,
        "GRID_ANALYTICS_QUERY_ATTRIBUTES"
    );

const solarIds =
    normalizeIds(
        SOLAR_ATTRIBUTE_IDS,
        "SOLAR_ATTRIBUTE_IDS"
    );

const families = [
    {
        family: "BATTERY",
        ids: batteryIds,
    },
    {
        family: "GENERATOR",
        ids: generatorIds,
    },
    {
        family: "GRID_MAP",
        ids: gridMapIds,
    },
    {
        family: "GRID_QUERY",
        ids: gridQueryIds,
    },
    {
        family: "SOLAR",
        ids: solarIds,
    },
];

for (const family of families) {
    console.log(`\n${subSeparator}`);
    console.log(`FAMILY: ${family.family}`);
    console.log(subSeparator);
    console.log(
        `Canonical attribute IDs: ${family.ids.length}`
    );
    printIds(family.ids);
}

/*
 * The persistence dependency union is intentionally based on the
 * canonical runtime exports rather than arbitrary numeric literals
 * found elsewhere in source code.
 */
const canonicalDependencyIds =
    normalizeIds(
        [
            ...batteryIds,
            ...generatorIds,
            ...gridQueryIds,
            ...solarIds,
        ],
        "CANONICAL_DEPENDENCY_UNION"
    );

const policyIds =
    normalizeIds(
        [...HISTORICAL_TELEMETRY_ATTRIBUTE_IDS],
        "HISTORICAL_TELEMETRY_ATTRIBUTE_IDS"
    );

const missingFromPolicy =
    difference(
        canonicalDependencyIds,
        policyIds
    );

const policyOutsideCanonicalUnion =
    difference(
        policyIds,
        canonicalDependencyIds
    );

const overlap =
    intersection(
        canonicalDependencyIds,
        policyIds
    );

console.log(`\n${separator}`);
console.log("CANONICAL DEPENDENCY UNION");
console.log(separator);
console.log(
    `Canonical unique IDs: ${canonicalDependencyIds.length}`
);
printIds(canonicalDependencyIds);

console.log(`\n${separator}`);
console.log("CURRENT PERSISTENCE POLICY");
console.log(separator);
console.log(
    `Policy unique IDs: ${policyIds.length}`
);
printIds(policyIds);

console.log(`\n${separator}`);
console.log("DEPENDENCY COVERAGE");
console.log(separator);

console.log(
    `Canonical IDs:             ${canonicalDependencyIds.length}`
);

console.log(
    `Policy IDs:                ${policyIds.length}`
);

console.log(
    `Canonical/policy overlap:  ${overlap.length}`
);

console.log(
    `Canonical IDs missing:     ${missingFromPolicy.length}`
);

printIds(missingFromPolicy);

console.log(
    `\nPolicy IDs outside canonical union: ${policyOutsideCanonicalUnion.length}`
);

printIds(policyOutsideCanonicalUnion);

/*
 * Cross-check Grid's explicit query list against GRID_ATTRIBUTE_MAP.
 *
 * Every persisted Grid analytics dependency should have a semantic
 * definition in the authoritative Grid map.
 */
const gridQueryMissingFromMap =
    difference(
        gridQueryIds,
        gridMapIds
    );

console.log(`\n${separator}`);
console.log("GRID CONTRACT CROSS-CHECK");
console.log(separator);

console.log(
    `GRID_ATTRIBUTE_MAP IDs:             ${gridMapIds.length}`
);

console.log(
    `GRID_ANALYTICS_QUERY_ATTRIBUTES:    ${gridQueryIds.length}`
);

console.log(
    `Query IDs absent from Grid map:     ${gridQueryMissingFromMap.length}`
);

printIds(gridQueryMissingFromMap);

if (gridQueryMissingFromMap.length > 0) {
    fail(
        "GRID_ANALYTICS_QUERY_ATTRIBUTES contains IDs absent from GRID_ATTRIBUTE_MAP"
    );
}

/*
 * Structural invariants.
 */
if (batteryIds.length === 0) {
    fail("BATTERY_ATTRIBUTE_MAP resolved to zero IDs");
}

if (generatorIds.length === 0) {
    fail("GENERATOR_ATTRIBUTE_MAP resolved to zero IDs");
}

if (gridQueryIds.length === 0) {
    fail(
        "GRID_ANALYTICS_QUERY_ATTRIBUTES resolved to zero IDs"
    );
}

if (solarIds.length === 0) {
    fail("SOLAR_ATTRIBUTE_IDS resolved to zero IDs");
}

console.log(`\n${separator}`);
console.log("VALIDATION RESULT");
console.log(separator);

if (failures.length > 0) {
    console.error(
        `Structural failures: ${failures.length}`
    );

    failures.forEach(
        (message, index) => {
            console.error(
                `${index + 1}. ${message}`
            );
        }
    );

    console.error("\nOVERALL RESULT: FAIL");
    process.exitCode = 1;
} else {
    console.log("Structural map validation: PASS");

    /*
     * Missing policy coverage is deliberately reported rather than
     * treated as a script failure at this stage. We are measuring the
     * required policy correction before modifying production policy.
     */
    if (missingFromPolicy.length > 0) {
        console.log(
            "\nDEPENDENCY COVERAGE RESULT: INCOMPLETE"
        );
        console.log(
            "The persistence policy must NOT yet be promoted."
        );
    } else {
        console.log(
            "\nDEPENDENCY COVERAGE RESULT: COMPLETE"
        );
    }

    console.log("\nOVERALL RESULT: PASS");
}