import { BATTERY_ATTRIBUTE_MAP } from "../services/engineering/batteryAttributeMap.js";
import { GENERATOR_ATTRIBUTE_MAP } from "../services/engineering/generatorAttributeMap.js";
import { GRID_ATTRIBUTE_MAP } from "../services/engineering/gridAttributeMap.js";
import { SOLAR_ATTRIBUTES_BY_ID } from "../services/engineering/solarAttributeMap.js";

function inspect(name, map) {
    const entries = Object.entries(map);

    console.log("\n============================================================");
    console.log(name);
    console.log("============================================================");
    console.log("Entry count:", entries.length);

    for (const [id, definition] of entries.slice(0, 5)) {
        console.log("\nATTRIBUTE:", id);

        console.dir(definition, {
            depth: 6,
            colors: false,
        });
    }
}

inspect(
    "BATTERY_ATTRIBUTE_MAP",
    BATTERY_ATTRIBUTE_MAP
);

inspect(
    "GENERATOR_ATTRIBUTE_MAP",
    GENERATOR_ATTRIBUTE_MAP
);

inspect(
    "GRID_ATTRIBUTE_MAP",
    GRID_ATTRIBUTE_MAP
);

inspect(
    "SOLAR_ATTRIBUTES_BY_ID",
    SOLAR_ATTRIBUTES_BY_ID
);
