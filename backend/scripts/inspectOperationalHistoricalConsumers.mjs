import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
    HISTORICAL_ANALYTICS_REQUIRED_ATTRIBUTE_IDS,
    HISTORICAL_OPERATIONAL_ATTRIBUTE_IDS,
    HISTORICAL_TELEMETRY_ATTRIBUTE_IDS,
} from "../services/sync/telemetryPersistencePolicy.js";


const __filename =
    fileURLToPath(import.meta.url);

const __dirname =
    path.dirname(__filename);

const BACKEND_ROOT =
    path.resolve(__dirname, "..");


/*
|--------------------------------------------------------------------------
| Scope
|--------------------------------------------------------------------------
|
| This is a READ-ONLY source inspection.
|
| It does NOT:
| - connect to MongoDB
| - call VRM
| - start the scheduler
| - modify Telemetry
| - modify SyncState
| - modify Installation
|
*/


const SOURCE_EXTENSIONS =
    new Set([
        ".js",
        ".mjs",
        ".cjs",
        ".jsx",
    ]);


const EXCLUDED_DIRECTORIES =
    new Set([
        "node_modules",
        ".git",
        "coverage",
        "dist",
        "build",
    ]);


/*
|--------------------------------------------------------------------------
| Files that would create circular/self evidence
|--------------------------------------------------------------------------
|
| The policy definition itself cannot prove that an operational attribute
| has a runtime consumer.
|
| Diagnostic/validation scripts are also excluded from consumer evidence.
|
*/

const shouldExcludeFile = (
    absolutePath
) => {
    const relative =
        path.relative(
            BACKEND_ROOT,
            absolutePath
        )
        .replaceAll("\\", "/");

    if (
        relative ===
        "services/sync/telemetryPersistencePolicy.js"
    ) {
        return true;
    }

    if (
        relative.startsWith(
            "scripts/"
        )
    ) {
        return true;
    }

    return false;
};


const walk = (
    directory,
    files = []
) => {
    const entries =
        fs.readdirSync(
            directory,
            {
                withFileTypes:
                    true,
            }
        );

    for (
        const entry
        of entries
    ) {
        const absolutePath =
            path.join(
                directory,
                entry.name
            );

        if (
            entry.isDirectory()
        ) {
            if (
                EXCLUDED_DIRECTORIES.has(
                    entry.name
                )
            ) {
                continue;
            }

            walk(
                absolutePath,
                files
            );

            continue;
        }

        if (
            !entry.isFile()
        ) {
            continue;
        }

        const extension =
            path.extname(
                entry.name
            );

        if (
            !SOURCE_EXTENSIONS.has(
                extension
            )
        ) {
            continue;
        }

        if (
            shouldExcludeFile(
                absolutePath
            )
        ) {
            continue;
        }

        files.push(
            absolutePath
        );
    }

    return files;
};


const escapeRegex = (
    value
) =>
    value.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
    );


/*
|--------------------------------------------------------------------------
| Exact numeric-token matching
|--------------------------------------------------------------------------
|
| Attribute 41 must not match 416.
| Attribute 50 must not match 150.
|
| This is lexical source evidence only. It is NOT by itself proof that
| the value is a historical Telemetry consumer.
|
*/

const makeAttributeRegex = (
    id
) =>
    new RegExp(
        `(?<![0-9])${escapeRegex(
            String(id)
        )}(?![0-9])`,
        "g"
    );


const classifyPath = (
    relativePath
) => {
    const value =
        relativePath.toLowerCase();

    if (
        value.includes(
            "dashboard"
        ) ||
        value.includes(
            "snapshot"
        )
    ) {
        return "DASHBOARD_OR_SNAPSHOT";
    }

    if (
        value.includes(
            "analytics"
        ) ||
        value.includes(
            "performance"
        ) ||
        value.includes(
            "energy"
        ) ||
        value.includes(
            "production"
        )
    ) {
        return "ANALYTICS_OR_PRODUCTION";
    }

    if (
        value.includes(
            "telemetry"
        ) ||
        value.includes(
            "electrical"
        )
    ) {
        return "TELEMETRY_OR_ELECTRICAL";
    }

    if (
        value.includes(
            "controller"
        ) ||
        value.includes(
            "route"
        )
    ) {
        return "API";
    }

    return "OTHER";
};


const sourceFiles =
    walk(
        BACKEND_ROOT
    );


const operationalIds =
    [
        ...HISTORICAL_OPERATIONAL_ATTRIBUTE_IDS,
    ]
    .sort(
        (a, b) =>
            a - b
    );


const analyticsIds =
    [
        ...HISTORICAL_ANALYTICS_REQUIRED_ATTRIBUTE_IDS,
    ];


console.log(`
============================================================
ASHMAAN OPERATIONAL HISTORICAL-CONSUMER INSPECTION
READ-ONLY — SOURCE INSPECTION ONLY
============================================================
`);


console.log(
    "Backend root          :",
    BACKEND_ROOT
);

console.log(
    "Source files inspected:",
    sourceFiles.length
);

console.log(
    "Analytics-required IDs:",
    analyticsIds.length
);

console.log(
    "Operational-only IDs  :",
    operationalIds.length
);

console.log(
    "Canonical policy IDs  :",
    HISTORICAL_TELEMETRY_ATTRIBUTE_IDS.size
);


/*
|--------------------------------------------------------------------------
| Structural invariants
|--------------------------------------------------------------------------
*/

const overlap =
    operationalIds.filter(
        (id) =>
            HISTORICAL_ANALYTICS_REQUIRED_ATTRIBUTE_IDS.has(
                id
            )
    );


console.log(
    "Layer overlap         :",
    overlap.length
);


if (
    overlap.length > 0
) {
    console.log(
        "Overlap IDs:",
        overlap.join(", ")
    );
}


/*
|--------------------------------------------------------------------------
| Source evidence
|--------------------------------------------------------------------------
*/

const results =
    [];


for (
    const id
    of operationalIds
) {
    const regex =
        makeAttributeRegex(
            id
        );

    const matches =
        [];


    for (
        const absolutePath
        of sourceFiles
    ) {
        const source =
            fs.readFileSync(
                absolutePath,
                "utf8"
            );

        regex.lastIndex =
            0;

        if (
            !regex.test(
                source
            )
        ) {
            continue;
        }


        const relativePath =
            path.relative(
                BACKEND_ROOT,
                absolutePath
            )
            .replaceAll(
                "\\",
                "/"
            );


        const lines =
            source.split(
                /\r?\n/
            );


        const lineNumbers =
            [];


        for (
            let index = 0;
            index < lines.length;
            index += 1
        ) {
            const lineRegex =
                makeAttributeRegex(
                    id
                );

            if (
                lineRegex.test(
                    lines[index]
                )
            ) {
                lineNumbers.push(
                    index + 1
                );
            }
        }


        matches.push({
            file:
                relativePath,

            category:
                classifyPath(
                    relativePath
                ),

            lines:
                lineNumbers.join(
                    ","
                ),
        });
    }


    results.push({
        id,
        files:
            matches.length,

        matches,
    });
}


/*
|--------------------------------------------------------------------------
| Summary table
|--------------------------------------------------------------------------
*/

console.log(`
============================================================
OPERATIONAL ATTRIBUTE SOURCE-EVIDENCE SUMMARY
============================================================
`);


console.table(
    results.map(
        ({
            id,
            files,
            matches,
        }) => ({
            vrmAttributeId:
                id,

            consumerFiles:
                files,

            categories:
                [
                    ...new Set(
                        matches.map(
                            (item) =>
                                item.category
                        )
                    ),
                ].join(
                    ", "
                ) ||
                "NONE",
        })
    )
);


/*
|--------------------------------------------------------------------------
| Detailed evidence
|--------------------------------------------------------------------------
*/

console.log(`
============================================================
DETAILED SOURCE EVIDENCE
============================================================
`);


for (
    const result
    of results
) {
    console.log(
        `\nATTRIBUTE ${result.id}`
    );

    if (
        result.matches.length ===
        0
    ) {
        console.log(
            "  NO NON-SCRIPT SOURCE MATCH"
        );

        continue;
    }


    for (
        const match
        of result.matches
    ) {
        console.log(
            `  [${match.category}] ${match.file}:${match.lines}`
        );
    }
}


/*
|--------------------------------------------------------------------------
| Evidence groups
|--------------------------------------------------------------------------
*/

const noSourceEvidence =
    results
        .filter(
            (item) =>
                item.matches.length ===
                0
        )
        .map(
            (item) =>
                item.id
        );


const withSourceEvidence =
    results
        .filter(
            (item) =>
                item.matches.length >
                0
        )
        .map(
            (item) =>
                item.id
        );


console.log(`
============================================================
EVIDENCE GROUPS
============================================================
`);


console.log(
    "Operational IDs with source evidence:",
    withSourceEvidence.length
);

console.log(
    withSourceEvidence.join(
        ", "
    ) ||
    "(none)"
);


console.log(
    "\nOperational IDs with NO source evidence:",
    noSourceEvidence.length
);

console.log(
    noSourceEvidence.join(
        ", "
    ) ||
    "(none)"
);


/*
|--------------------------------------------------------------------------
| Important interpretation boundary
|--------------------------------------------------------------------------
*/

console.log(`
============================================================
INTERPRETATION BOUNDARY
============================================================

A numeric source match proves only that the attribute ID occurs in a
non-script backend source file.

It does NOT yet prove:

1. that the file is reachable at runtime;
2. that the attribute is queried from MongoDB Telemetry;
3. that historical samples are required;
4. that a latest-value/snapshot requirement requires long-term RAW history.

The detailed file/line evidence must be reviewed before any operational ID
is removed from the persistence policy.

NO DATABASE CONNECTION.
NO VRM CALL.
NO SCHEDULER.
NO FILE MODIFICATION.
============================================================
`);