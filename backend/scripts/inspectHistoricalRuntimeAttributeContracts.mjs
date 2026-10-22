// scripts/inspectHistoricalRuntimeAttributeContracts.mjs

import {
    BATTERY_PROFILE_ATTRIBUTE_IDS,
    BATTERY_PRODUCTION_ATTRIBUTE_IDS,
} from "../services/engineering/batteryTelemetryAdapter.js";

import {
    GENERATOR_PRODUCTION_ATTRIBUTES,
    GENERATOR_PRODUCTION_QUERY_ATTRIBUTES,
} from "../services/engineering/generatorProductionAdapterSupport.js";

import {
    GRID_DIRECT_POWER_ATTRIBUTES,
    GRID_CONDITIONAL_ACTIVE_INPUT_POWER_ATTRIBUTES,
    GRID_ACTIVE_INPUT_VOLTAGE_ATTRIBUTES,
    GRID_ACTIVE_INPUT_CURRENT_ATTRIBUTES,
    GRID_ACTIVE_INPUT_FREQUENCY_ATTRIBUTES,
    GRID_SOURCE_CONTEXT_ATTRIBUTES,
    GRID_SERVED_LOAD_CONTEXT_ATTRIBUTES,
    GRID_ANALYTICS_QUERY_ATTRIBUTES,
} from "../services/engineering/gridAttributeMap.js";

import {
    SOLAR_PRODUCTION_ATTRIBUTES,
    SOLAR_PRODUCTION_ATTRIBUTE_IDS,
} from "../services/engineering/solarProductionTelemetryService.js";

import {
    ENERGY_SOURCE_PRODUCTION_ATTRIBUTE_IDS,
    ENERGY_SOURCE_PRODUCTION_DIRECT_ATTRIBUTE_IDS,
} from "../services/engineering/energySourceTelemetryAdapter.js";

import {
    HISTORICAL_TELEMETRY_ATTRIBUTE_IDS,
} from "../services/sync/telemetryPersistencePolicy.js";

const banner = (title) => {
    console.log("\n" + "=".repeat(100));
    console.log(title);
    console.log("=".repeat(100));
};

const normalizeIds = (values) => {
    if (!values) {
        return [];
    }

    const source =
        values instanceof Set
            ? [...values]
            : Array.isArray(values)
              ? values
              : Object.values(values).flat(Infinity);

    return [
        ...new Set(
            source
                .map((value) => {
                    if (
                        value &&
                        typeof value === "object" &&
                        "id" in value
                    ) {
                        return Number(value.id);
                    }

                    if (
                        value &&
                        typeof value === "object" &&
                        "attributeId" in value
                    ) {
                        return Number(value.attributeId);
                    }

                    return Number(value);
                })
                .filter(Number.isFinite)
        ),
    ].sort((a, b) => a - b);
};

const printSet = (name, values) => {
    const ids = normalizeIds(values);

    console.log(`\n${name}`);
    console.log(`COUNT: ${ids.length}`);
    console.log(`IDS:   ${ids.join(", ") || "(none)"}`);

    return ids;
};

banner("ASHMAAN HISTORICAL RUNTIME ATTRIBUTE CONTRACTS");

console.log("Mode: SOURCE / MODULE INSPECTION ONLY");
console.log("MongoDB: NOT USED");
console.log("VRM API: NOT USED");
console.log("Scheduler: NOT USED");

const contracts = {};

banner("BATTERY");

contracts.BATTERY_PROFILE =
    printSet(
        "BATTERY_PROFILE_ATTRIBUTE_IDS",
        BATTERY_PROFILE_ATTRIBUTE_IDS
    );

contracts.BATTERY_PRODUCTION =
    printSet(
        "BATTERY_PRODUCTION_ATTRIBUTE_IDS",
        BATTERY_PRODUCTION_ATTRIBUTE_IDS
    );

banner("GENERATOR");

for (
    const [groupName, groupValues]
    of Object.entries(GENERATOR_PRODUCTION_ATTRIBUTES)
) {
    printSet(
        `GENERATOR_PRODUCTION_ATTRIBUTES.${groupName}`,
        groupValues
    );
}

contracts.GENERATOR_QUERY =
    printSet(
        "GENERATOR_PRODUCTION_QUERY_ATTRIBUTES",
        GENERATOR_PRODUCTION_QUERY_ATTRIBUTES
    );

banner("GRID");

printSet(
    "GRID_DIRECT_POWER_ATTRIBUTES",
    GRID_DIRECT_POWER_ATTRIBUTES
);

printSet(
    "GRID_CONDITIONAL_ACTIVE_INPUT_POWER_ATTRIBUTES",
    GRID_CONDITIONAL_ACTIVE_INPUT_POWER_ATTRIBUTES
);

printSet(
    "GRID_ACTIVE_INPUT_VOLTAGE_ATTRIBUTES",
    GRID_ACTIVE_INPUT_VOLTAGE_ATTRIBUTES
);

printSet(
    "GRID_ACTIVE_INPUT_CURRENT_ATTRIBUTES",
    GRID_ACTIVE_INPUT_CURRENT_ATTRIBUTES
);

printSet(
    "GRID_ACTIVE_INPUT_FREQUENCY_ATTRIBUTES",
    GRID_ACTIVE_INPUT_FREQUENCY_ATTRIBUTES
);

printSet(
    "GRID_SOURCE_CONTEXT_ATTRIBUTES",
    GRID_SOURCE_CONTEXT_ATTRIBUTES
);

printSet(
    "GRID_SERVED_LOAD_CONTEXT_ATTRIBUTES",
    GRID_SERVED_LOAD_CONTEXT_ATTRIBUTES
);

contracts.GRID_QUERY =
    printSet(
        "GRID_ANALYTICS_QUERY_ATTRIBUTES",
        GRID_ANALYTICS_QUERY_ATTRIBUTES
    );

banner("SOLAR");

for (
    const [groupName, groupValues]
    of Object.entries(SOLAR_PRODUCTION_ATTRIBUTES)
) {
    printSet(
        `SOLAR_PRODUCTION_ATTRIBUTES.${groupName}`,
        groupValues
    );
}

contracts.SOLAR_PRODUCTION =
    printSet(
        "SOLAR_PRODUCTION_ATTRIBUTE_IDS",
        SOLAR_PRODUCTION_ATTRIBUTE_IDS
    );

banner("ENERGY SOURCE");

contracts.ENERGY_SOURCE =
    printSet(
        "ENERGY_SOURCE_PRODUCTION_ATTRIBUTE_IDS",
        ENERGY_SOURCE_PRODUCTION_ATTRIBUTE_IDS
    );

contracts.ENERGY_SOURCE_DIRECT =
    printSet(
        "ENERGY_SOURCE_PRODUCTION_DIRECT_ATTRIBUTE_IDS",
        ENERGY_SOURCE_PRODUCTION_DIRECT_ATTRIBUTE_IDS
    );

banner("CURRENT HISTORICAL PERSISTENCE POLICY");

const currentPolicy =
    printSet(
        "HISTORICAL_TELEMETRY_ATTRIBUTE_IDS",
        HISTORICAL_TELEMETRY_ATTRIBUTE_IDS
    );

const requiredRuntimeIds = [
    ...new Set(
        Object.values(contracts)
            .flat()
            .map(Number)
            .filter(Number.isFinite)
    ),
].sort((a, b) => a - b);

const currentPolicySet = new Set(currentPolicy);
const requiredRuntimeSet = new Set(requiredRuntimeIds);

const missingFromPolicy =
    requiredRuntimeIds.filter(
        (id) => !currentPolicySet.has(id)
    );

const policyOutsideRuntime =
    currentPolicy.filter(
        (id) => !requiredRuntimeSet.has(id)
    );

banner("RUNTIME CONTRACT UNION");

console.log(`COUNT: ${requiredRuntimeIds.length}`);
console.log(
    `IDS:   ${requiredRuntimeIds.join(", ") || "(none)"}`
);

banner("MISSING FROM CURRENT PERSISTENCE POLICY");

console.log(`COUNT: ${missingFromPolicy.length}`);
console.log(
    `IDS:   ${missingFromPolicy.join(", ") || "(none)"}`
);

banner("CURRENT POLICY IDS OUTSIDE THESE RUNTIME CONTRACTS");

console.log(`COUNT: ${policyOutsideRuntime.length}`);
console.log(
    `IDS:   ${policyOutsideRuntime.join(", ") || "(none)"}`
);

banner("CONTRACT COVERAGE");

console.table(
    Object.entries(contracts).map(
        ([name, ids]) => ({
            contract: name,
            required: ids.length,
            persisted: ids.filter(
                (id) => currentPolicySet.has(id)
            ).length,
            missing: ids.filter(
                (id) => !currentPolicySet.has(id)
            ).length,
        })
    )
);

console.log(
    "\nSOURCE-ONLY RUNTIME ATTRIBUTE CONTRACT INSPECTION COMPLETE."
);