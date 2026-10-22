/**
 * ASHMAAN
 * scripts/inspectHistoricalPersistenceDependencies.js
 *
 * PURPOSE
 * -------
 * Read-only source-code inspector used to derive the VRM telemetry
 * attribute IDs referenced by ASHMAAN's downstream engineering and
 * dashboard layers.
 *
 * This script:
 *   - scans selected engineering/dashboard JS source files
 *   - extracts numeric VRM attribute IDs conservatively
 *   - groups IDs by functional family
 *   - calculates the canonical union
 *   - compares the union with the provisional historical persistence policy
 *
 * IMPORTANT
 * ---------
 * - NO MongoDB connection
 * - NO VRM API call
 * - NO writes
 * - NO deletions
 * - NO scheduler
 *
 * This is a dependency-inspection gate only.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BACKEND_ROOT = path.resolve(__dirname, "..");

/* -------------------------------------------------------------------------- */
/* Provisional persistence policy                                              */
/* -------------------------------------------------------------------------- */

const PROVISIONAL_POLICY = new Set([
    // VE.Bus / inverter
    14,
    15,
    16,
    20,
    21,
    22,
    23,
    24,
    25,
    29,
    30,
    31,
    41,

    // Battery
    39,
    47,
    49,
    50,
    51,
    52,
    143,
    144,
    145,
    147,
    215,
    243,
    263,

    // AC consumption
    131,
    132,
    133,

    // Generator overview
    137,
    138,
    139,

    // Grid direct power
    379,
    380,
    381,

    // Active source
    471,

    // Dedicated generator
    426,
    427,
    428,
    431,
    432,
    433,
    434,
    436,
    437,
    438,

    // AC output consumption
    567,
    568,
    569,

    // Grid meter
    834,
    835,
    836,
    837,
    838,
    839,
    840,
    841,
    842,

    // Generator runtime
    1018,
]);

/* -------------------------------------------------------------------------- */
/* Source families                                                             */
/* -------------------------------------------------------------------------- */

const SOURCE_GROUPS = Object.freeze({
    BATTERY: [
        "services/engineering/batteryAttributeMap.js",
        "services/engineering/batteryTelemetryAdapter.js",
        "services/engineering/batteryAnalyticsService.js",
        "services/engineering/batteryCycleThroughputService.js",
    ],

    GENERATOR: [
        "services/engineering/generatorAttributeMap.js",
        "services/engineering/generatorTelemetryAdapter.js",
        "services/engineering/generatorProductionAdapterSupport.js",
        "services/engineering/generatorProductionEnergyIntervalService.js",
        "services/engineering/generatorProductionPowerService.js",
    ],

    GRID: [
        "services/engineering/gridAttributeMap.js",
        "services/engineering/gridTelemetryAdapter.js",
    ],

    SOLAR: [
        "services/engineering/solarAttributeMap.js",
        "services/engineering/solarTelemetryAdapter.js",
        "services/engineering/solarProductionTelemetryService.js",
        "services/engineering/solarProductionPowerIntegrationService.js",
    ],

    SITE_ELECTRICAL: [
        "services/engineering/siteElectricalTelemetryAdapter.js",
    ],

    ENERGY_SOURCE: [
        "services/engineering/energySourceTelemetryAdapter.js",
    ],

    DASHBOARD: [
        "services/dashboard/siteTelemetrySnapshotService.js",
    ],
});

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

function normalizePath(relativePath) {
    return path.resolve(
        BACKEND_ROOT,
        ...relativePath.split("/")
    );
}

function fileExists(relativePath) {
    return fs.existsSync(normalizePath(relativePath));
}

function readSource(relativePath) {
    return fs.readFileSync(
        normalizePath(relativePath),
        "utf8"
    );
}

function uniqueSorted(values) {
    return [
        ...new Set(
            values
                .map(Number)
                .filter(
                    (value) =>
                        Number.isInteger(value) &&
                        value >= 0
                )
        ),
    ].sort((a, b) => a - b);
}

/**
 * Conservative numeric extraction.
 *
 * We deliberately do NOT collect every integer appearing in a JS file.
 * That would incorrectly treat:
 *   - timeouts
 *   - array positions
 *   - percentages
 *   - HTTP status codes
 *   - phase numbers
 *   - line constants
 * as VRM attributes.
 *
 * Instead we look for values appearing in attribute-oriented contexts.
 */
function extractAttributeIds(source) {
    const ids = [];

    const patterns = [
        /*
         * attributeId: 123
         * vrmAttributeId: 123
         */
        /\b(?:vrmAttributeId|attributeId)\s*:\s*(\d+)\b/g,

        /*
         * vrmAttributeId === 123
         * attributeId === 123
         */
        /\b(?:vrmAttributeId|attributeId)\s*={2,3}\s*(\d+)\b/g,

        /*
         * Number(record.vrmAttributeId) === 1742
         */
        /Number\s*\(\s*[^)]*(?:vrmAttributeId|attributeId)[^)]*\)\s*={2,3}\s*(\d+)\b/g,

        /*
         * .vrmAttributeId === 123
         */
        /\.(?:vrmAttributeId|attributeId)\s*={2,3}\s*(\d+)\b/g,

        /*
         * get...Attribute...(123)
         * is...Attribute...(123)
         */
        /\b(?:get|is|has|find|resolve)[A-Za-z0-9_]*Attribute[A-Za-z0-9_]*\s*\(\s*(\d+)\s*\)/g,
    ];

    for (const pattern of patterns) {
        for (const match of source.matchAll(pattern)) {
            const numeric = Number(match[1]);

            if (
                Number.isInteger(numeric) &&
                numeric >= 0
            ) {
                ids.push(numeric);
            }
        }
    }

    /*
     * Attribute maps often use:
     *
     * 334: entry({
     *     attributeId: 334,
     * ...
     *
     * The attributeId pattern above already captures the authoritative
     * value. Therefore object keys themselves are intentionally ignored.
     */

    return uniqueSorted(ids);
}

function inspectFile(relativePath) {
    if (!fileExists(relativePath)) {
        return {
            file: relativePath,
            exists: false,
            ids: [],
        };
    }

    const source = readSource(relativePath);
    const ids = extractAttributeIds(source);

    return {
        file: relativePath,
        exists: true,
        ids,
    };
}

function setDifference(left, right) {
    return uniqueSorted(
        [...left].filter(
            (value) => !right.has(value)
        )
    );
}

function setIntersection(left, right) {
    return uniqueSorted(
        [...left].filter(
            (value) => right.has(value)
        )
    );
}

function printIds(ids) {
    if (!ids.length) {
        console.log("  (none)");
        return;
    }

    const width = 12;

    for (
        let index = 0;
        index < ids.length;
        index += width
    ) {
        console.log(
            "  " +
                ids
                    .slice(index, index + width)
                    .join(", ")
        );
    }
}

/* -------------------------------------------------------------------------- */
/* Main                                                                        */
/* -------------------------------------------------------------------------- */

function main() {
    console.log(
        "\n============================================================"
    );
    console.log(
        "ASHMAAN HISTORICAL PERSISTENCE DEPENDENCY INSPECTOR"
    );
    console.log(
        "============================================================"
    );

    console.log(`Backend root: ${BACKEND_ROOT}`);
    console.log("Mode: READ ONLY");
    console.log("MongoDB: NOT USED");
    console.log("VRM API: NOT USED");
    console.log("Scheduler: NOT USED");

    const familyResults = {};
    const canonicalIds = new Set();

    let filesInspected = 0;
    let filesMissing = 0;

    for (
        const [family, files]
        of Object.entries(SOURCE_GROUPS)
    ) {
        console.log(
            `\n------------------------------------------------------------`
        );
        console.log(`FAMILY: ${family}`);
        console.log(
            `------------------------------------------------------------`
        );

        const familyIds = new Set();
        const fileResults = [];

        for (const relativePath of files) {
            const result = inspectFile(relativePath);

            fileResults.push(result);

            if (!result.exists) {
                filesMissing += 1;

                console.log(
                    `MISSING  ${relativePath}`
                );

                continue;
            }

            filesInspected += 1;

            for (const id of result.ids) {
                familyIds.add(id);
                canonicalIds.add(id);
            }

            console.log(
                `FOUND    ${relativePath}`
            );

            console.log(
                `         extracted IDs: ${result.ids.length}`
            );

            if (result.ids.length) {
                console.log(
                    `         ${result.ids.join(", ")}`
                );
            }
        }

        const sortedFamilyIds =
            uniqueSorted([...familyIds]);

        familyResults[family] = {
            files: fileResults,
            ids: sortedFamilyIds,
        };

        console.log(
            `\n${family} UNIQUE ATTRIBUTE IDS: ${sortedFamilyIds.length}`
        );

        printIds(sortedFamilyIds);
    }

    const canonicalSorted =
        uniqueSorted([...canonicalIds]);

    const canonicalSet =
        new Set(canonicalSorted);

    const provisionalSorted =
        uniqueSorted([...PROVISIONAL_POLICY]);

    const missingFromProvisional =
        setDifference(
            canonicalSet,
            PROVISIONAL_POLICY
        );

    const provisionalNotReferenced =
        setDifference(
            PROVISIONAL_POLICY,
            canonicalSet
        );

    const overlap =
        setIntersection(
            canonicalSet,
            PROVISIONAL_POLICY
        );

    console.log(
        "\n============================================================"
    );
    console.log(
        "CANONICAL DEPENDENCY UNION"
    );
    console.log(
        "============================================================"
    );

    console.log(
        `Canonical unique IDs: ${canonicalSorted.length}`
    );

    printIds(canonicalSorted);

    console.log(
        "\n============================================================"
    );
    console.log(
        "PROVISIONAL POLICY COMPARISON"
    );
    console.log(
        "============================================================"
    );

    console.log(
        `Provisional policy IDs: ${provisionalSorted.length}`
    );

    console.log(
        `Canonical/provisional overlap: ${overlap.length}`
    );

    console.log(
        `Canonical IDs MISSING from provisional policy: ${missingFromProvisional.length}`
    );

    printIds(missingFromProvisional);

    console.log(
        `\nProvisional IDs not detected by this source scan: ${provisionalNotReferenced.length}`
    );

    printIds(provisionalNotReferenced);

    console.log(
        "\n============================================================"
    );
    console.log(
        "FAMILY SUMMARY"
    );
    console.log(
        "============================================================"
    );

    console.table(
        Object.entries(familyResults).map(
            ([family, result]) => ({
                family,
                files:
                    result.files.length,
                existingFiles:
                    result.files.filter(
                        (item) => item.exists
                    ).length,
                attributeIds:
                    result.ids.length,
            })
        )
    );

    console.log(
        "\n============================================================"
    );
    console.log(
        "INSPECTION SUMMARY"
    );
    console.log(
        "============================================================"
    );

    console.log(
        `Files inspected: ${filesInspected}`
    );

    console.log(
        `Files missing:   ${filesMissing}`
    );

    console.log(
        `Canonical IDs:   ${canonicalSorted.length}`
    );

    console.log(
        `Policy IDs:      ${provisionalSorted.length}`
    );

    console.log(
        `Policy overlap:  ${overlap.length}`
    );

    console.log(
        `Policy missing:  ${missingFromProvisional.length}`
    );

    console.log(
        "\nREAD-ONLY INSPECTION COMPLETE."
    );

    if (filesMissing > 0) {
        console.log(
            "\nNOTE: One or more expected files were not present."
        );

        console.log(
            "Do not promote the derived union to the persistence policy until those paths are reviewed."
        );
    }

    if (missingFromProvisional.length > 0) {
        console.log(
            "\nRESULT: PROVISIONAL POLICY IS INCOMPLETE."
        );

        console.log(
            "Do not start the historical telemetry scheduler yet."
        );
    } else {
        console.log(
            "\nRESULT: No statically detected downstream IDs are missing from the provisional policy."
        );

        console.log(
            "This is not yet permission to start the scheduler; runtime-response comparison remains required."
        );
    }

    console.log();
}

try {
    main();
} catch (error) {
    console.error(
        "\nHISTORICAL PERSISTENCE DEPENDENCY INSPECTION FAILED"
    );

    console.error(
        error?.stack ??
            error?.message ??
            error
    );

    process.exitCode = 1;
}