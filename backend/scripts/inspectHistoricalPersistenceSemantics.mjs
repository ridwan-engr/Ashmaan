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
    GRID_ANALYTICS_QUERY_ATTRIBUTES,
    GRID_ATTRIBUTE_MAP,
} from "../services/engineering/gridAttributeMap.js";

import {
    SOLAR_ATTRIBUTE_IDS,
    SOLAR_ATTRIBUTES_BY_ID,
} from "../services/engineering/solarAttributeMap.js";

const separator = "=".repeat(100);

function bool(value) {
    if (value === true) return "YES";
    if (value === false) return "NO";
    return "-";
}

function valueOrDash(value) {
    return value === undefined ||
        value === null ||
        value === ""
        ? "-"
        : String(value);
}

function inCurrentPolicy(id) {
    return HISTORICAL_TELEMETRY_ATTRIBUTE_IDS.has(
        Number(id)
    );
}

function printFamily(name, rows) {
    console.log(`\n${separator}`);
    console.log(name);
    console.log(separator);

    console.table(rows);
}

/* -------------------------------------------------------------------------- */
/* Battery                                                                     */
/* -------------------------------------------------------------------------- */

const batteryRows = Object.entries(
    BATTERY_ATTRIBUTE_MAP
)
    .map(([id, definition]) => ({
        id: Number(id),

        name:
            definition.label ??
            definition.name ??
            "-",

        signalClass:
            valueOrDash(
                definition.signalClass
            ),

        role:
            valueOrDash(
                definition.calculationRole
            ),

        calculation:
            bool(
                definition.calculationEnabled
            ),

        cumulative:
            bool(
                definition.cumulative
            ),

        delta:
            bool(
                definition.delta
            ),

        priority:
            valueOrDash(
                definition.preferredPriority
            ),

        persisted:
            bool(
                inCurrentPolicy(id)
            ),
    }))
    .sort((a, b) => a.id - b.id);

/* -------------------------------------------------------------------------- */
/* Generator                                                                   */
/* -------------------------------------------------------------------------- */

const generatorRows = Object.entries(
    GENERATOR_ATTRIBUTE_MAP
)
    .map(([id, definition]) => ({
        id: Number(id),

        name:
            definition.name ??
            definition.label ??
            "-",

        signalClass:
            valueOrDash(
                definition.signalClass
            ),

        role:
            valueOrDash(
                definition.role
            ),

        calculation:
            bool(
                definition.calculationEnabled
            ),

        unitEstablished:
            bool(
                definition.unitEstablished
            ),

        stateMapping:
            bool(
                definition.stateMappingEstablished
            ),

        counterSemantics:
            bool(
                definition.counterSemanticsEstablished
            ),

        persisted:
            bool(
                inCurrentPolicy(id)
            ),
    }))
    .sort((a, b) => a.id - b.id);

/* -------------------------------------------------------------------------- */
/* Grid                                                                        */
/* -------------------------------------------------------------------------- */

const gridQuerySet =
    new Set(
        GRID_ANALYTICS_QUERY_ATTRIBUTES.map(
            Number
        )
    );

const gridRows = Object.entries(
    GRID_ATTRIBUTE_MAP
)
    .map(([id, definition]) => ({
        id: Number(id),

        role:
            valueOrDash(
                definition.role
            ),

        status:
            valueOrDash(
                definition.status
            ),

        phase:
            valueOrDash(
                definition.phase
            ),

        sourceIdentityRequired:
            bool(
                definition.sourceIdentityRequired
            ),

        activeSourceCode:
            valueOrDash(
                definition.requiredActiveSourceCode
            ),

        analyticsQuery:
            bool(
                gridQuerySet.has(
                    Number(id)
                )
            ),

        persisted:
            bool(
                inCurrentPolicy(id)
            ),
    }))
    .sort((a, b) => a.id - b.id);

/* -------------------------------------------------------------------------- */
/* Solar                                                                       */
/* -------------------------------------------------------------------------- */

const solarIdSet =
    new Set(
        SOLAR_ATTRIBUTE_IDS.map(Number)
    );

const solarRows = Object.entries(
    SOLAR_ATTRIBUTES_BY_ID
)
    .filter(
        ([id]) =>
            solarIdSet.has(Number(id))
    )
    .map(([id, definition]) => ({
        id: Number(id),

        key:
            valueOrDash(
                definition.key
            ),

        role:
            valueOrDash(
                definition.role
            ),

        semanticStatus:
            valueOrDash(
                definition.semanticStatus
            ),

        dataKind:
            valueOrDash(
                definition.dataKind
            ),

        boundary:
            valueOrDash(
                definition.measurementBoundary
            ),

        power:
            bool(
                definition
                    .qualification
                    ?.usableForPower
            ),

        energy:
            bool(
                definition
                    .qualification
                    ?.usableForEnergy
            ),

        operatingState:
            bool(
                definition
                    .qualification
                    ?.usableForOperatingState
            ),

        availability:
            bool(
                definition
                    .qualification
                    ?.usableForAvailability
            ),

        performance:
            bool(
                definition
                    .qualification
                    ?.usableForPerformance
            ),

        aggregation:
            bool(
                definition
                    .qualification
                    ?.aggregationAllowed
            ),

        persisted:
            bool(
                inCurrentPolicy(id)
            ),
    }))
    .sort((a, b) => a.id - b.id);

/* -------------------------------------------------------------------------- */
/* Output                                                                      */
/* -------------------------------------------------------------------------- */

console.log(`\n${separator}`);
console.log(
    "ASHMAAN HISTORICAL PERSISTENCE SEMANTIC INVENTORY"
);
console.log(separator);

console.log("Mode: READ ONLY");
console.log("MongoDB: NOT USED");
console.log("VRM API: NOT USED");
console.log("Scheduler: NOT USED");
console.log(
    `Current persistence policy size: ${
        HISTORICAL_TELEMETRY_ATTRIBUTE_IDS.size
    }`
);

printFamily(
    "BATTERY ATTRIBUTE SEMANTICS",
    batteryRows
);

printFamily(
    "GENERATOR ATTRIBUTE SEMANTICS",
    generatorRows
);

printFamily(
    "GRID ATTRIBUTE SEMANTICS",
    gridRows
);

printFamily(
    "SOLAR ATTRIBUTE SEMANTICS",
    solarRows
);

/* -------------------------------------------------------------------------- */
/* Summary                                                                     */
/* -------------------------------------------------------------------------- */

const summary = [
    {
        family: "BATTERY",
        canonical: batteryRows.length,
        calculationEnabled:
            batteryRows.filter(
                (row) =>
                    row.calculation === "YES"
            ).length,
        currentlyPersisted:
            batteryRows.filter(
                (row) =>
                    row.persisted === "YES"
            ).length,
    },

    {
        family: "GENERATOR",
        canonical: generatorRows.length,
        calculationEnabled:
            generatorRows.filter(
                (row) =>
                    row.calculation === "YES"
            ).length,
        currentlyPersisted:
            generatorRows.filter(
                (row) =>
                    row.persisted === "YES"
            ).length,
    },

    {
        family: "GRID",
        canonical: gridRows.length,
        calculationEnabled:
            gridRows.filter(
                (row) =>
                    row.analyticsQuery === "YES"
            ).length,
        currentlyPersisted:
            gridRows.filter(
                (row) =>
                    row.persisted === "YES"
            ).length,
    },

    {
        family: "SOLAR",
        canonical: solarRows.length,

        calculationEnabled:
            solarRows.filter(
                (row) =>
                    row.power === "YES" ||
                    row.energy === "YES" ||
                    row.operatingState === "YES" ||
                    row.availability === "YES" ||
                    row.performance === "YES"
            ).length,

        currentlyPersisted:
            solarRows.filter(
                (row) =>
                    row.persisted === "YES"
            ).length,
    },
];

console.log(`\n${separator}`);
console.log("SEMANTIC INVENTORY SUMMARY");
console.log(separator);

console.table(summary);

console.log(
    "\nREAD-ONLY SEMANTIC INVENTORY COMPLETE."
);